import { Injectable, NotFoundException } from '@nestjs/common'
import puppeteer from 'puppeteer'
import * as ejs from 'ejs'
import * as path from 'path'
import { DefenseCouncilRepository } from '../repository/defense-council.repository'
import { DefenseCouncil, TopicAssignment } from '../schemas/defense-council.schema'

interface CouncilStats {
    totalTopics: number
    completedTopics: number
    averageScore: number
    highestScore: number
    lowestScore: number
    gradeDistribution: {
        xuatSac: number
        gioi: number
        kha: number
        trungBinh: number
        yeu: number
        kem: number
    }
}

@Injectable()
export class DefensePdfProvider {
    constructor(private readonly defenseCouncilRepository: DefenseCouncilRepository) {}

    /**
     * Tạo báo cáo PDF cho toàn bộ hội đồng
     */
    async generateCouncilReport(councilId: string): Promise<Buffer> {
        const council = await this.defenseCouncilRepository.getCouncilById(councilId)

        if (!council.isCompleted) {
            throw new NotFoundException('Hội đồng chưa hoàn thành, không thể xuất báo cáo')
        }

        const stats = this.calculateCouncilStats(council)
        const html = await this.renderCouncilReportTemplate(council, stats)

        return await this.generatePdfFromHtml(html)
    }

    /**
     * Tạo phiếu điểm PDF cho một đề tài
     */
    async generateTopicScoreCard(councilId: string, topicId: string): Promise<Buffer> {
        const council = await this.defenseCouncilRepository.getCouncilById(councilId)

        const topic = council.topics.find((t) => t.topicId.toString() === topicId)
        if (!topic) {
            throw new NotFoundException('Không tìm thấy đề tài trong hội đồng này')
        }

        if (!council.isPublished) {
            throw new NotFoundException('Điểm chưa được công bố')
        }

        const html = await this.renderScoreCardTemplate(council, topic)

        return await this.generatePdfFromHtml(html)
    }

    /**
     * Tính toán thống kê cho hội đồng
     */
    private calculateCouncilStats(council: DefenseCouncil): CouncilStats {
        const topics = council.topics

        if (topics.length === 0) {
            return {
                totalTopics: 0,
                completedTopics: 0,
                averageScore: 0,
                highestScore: 0,
                lowestScore: 0,
                gradeDistribution: {
                    xuatSac: 0,
                    gioi: 0,
                    kha: 0,
                    trungBinh: 0,
                    yeu: 0,
                    kem: 0
                }
            }
        }

        const scores = topics.map((t) => t.finalScore).filter((s) => s !== undefined && s !== null)

        return {
            totalTopics: topics.length,
            completedTopics: topics.filter((t) => t.scores && t.scores.length > 0).length,
            averageScore: scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0,
            highestScore: scores.length > 0 ? Math.max(...scores) : 0,
            lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
            gradeDistribution: this.getGradeDistribution(topics)
        }
    }

    /**
     * Tính phân bố xếp loại
     */
    private getGradeDistribution(topics: TopicAssignment[]) {
        return {
            xuatSac: topics.filter((t) => t.gradeText === 'Xuất sắc').length,
            gioi: topics.filter((t) => t.gradeText === 'Giỏi').length,
            kha: topics.filter((t) => t.gradeText === 'Khá').length,
            trungBinh: topics.filter((t) => t.gradeText === 'Trung bình').length,
            yeu: topics.filter((t) => t.gradeText === 'Yếu').length,
            kem: topics.filter((t) => t.gradeText === 'Kém').length
        }
    }

    /**
     * Render template báo cáo hội đồng
     */
    private async renderCouncilReportTemplate(council: DefenseCouncil, stats: CouncilStats): Promise<string> {
        const templatePath = path.join(__dirname, '../templates/council-report.ejs')

        const roleLabels = {
            supervisor: 'GVHD',
            reviewer: 'GVPB',
            secretary: 'Thư ký',
            chairperson: 'Chủ tịch',
            member: 'Ủy viên'
        }

        return await ejs.renderFile(templatePath, {
            council,
            stats,
            roleLabels,
            generatedDate: new Date(),
            formatDate: (date: Date) => new Date(date).toLocaleDateString('vi-VN'),
            formatDateTime: (date: Date) =>
                new Date(date).toLocaleString('vi-VN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                })
        })
    }

    /**
     * Render template phiếu điểm đề tài
     */
    private async renderScoreCardTemplate(council: DefenseCouncil, topic: TopicAssignment): Promise<string> {
        const templatePath = path.join(__dirname, '../templates/score-card.ejs')

        const roleLabels = {
            supervisor: 'GVHD',
            reviewer: 'GVPB',
            secretary: 'Thư ký',
            chairperson: 'Chủ tịch',
            member: 'Ủy viên'
        }

        return await ejs.renderFile(templatePath, {
            council,
            topic,
            roleLabels,
            generatedDate: new Date(),
            formatDate: (date: Date) => new Date(date).toLocaleDateString('vi-VN')
        })
    }

    /**
     * Tạo PDF từ HTML bằng Puppeteer
     */
    private async generatePdfFromHtml(html: string): Promise<Buffer> {
        let browser
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            })

            const page = await browser.newPage()
            await page.setContent(html, { waitUntil: 'networkidle0' })

            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '1cm',
                    bottom: '1cm',
                    left: '1.5cm',
                    right: '1.5cm'
                }
            })

            return Buffer.from(pdf)
        } finally {
            if (browser) {
                await browser.close()
            }
        }
    }
}
