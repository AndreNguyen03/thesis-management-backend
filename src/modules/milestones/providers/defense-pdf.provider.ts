import { Injectable, NotFoundException } from '@nestjs/common'
import puppeteer from 'puppeteer'
import * as ejs from 'ejs'
import * as path from 'path'
import { DefenseCouncilRepository } from '../repository/defense-council.repository'
import { DefenseCouncil, TopicAssignment, Score, ScoreType } from '../schemas/defense-council.schema'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { EvaluationTemplate } from '../schemas/evaluation-template.schema'

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
    constructor(
        private readonly defenseCouncilRepository: DefenseCouncilRepository,
        @InjectModel(EvaluationTemplate.name) private evaluationTemplateModel: Model<EvaluationTemplate>
    ) {}

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
     * Tạo phiếu đánh giá chi tiết PDF với điểm theo tiêu chí cho tất cả sinh viên
     */
    async generateEvaluationFormPdf(councilId: string, topicId: string, scorerId: string): Promise<Buffer> {
        const council = await this.defenseCouncilRepository.getCouncilById(councilId)

        const topic = council.topics.find((t) => t.topicId.toString() === topicId)
        if (!topic) {
            throw new NotFoundException('Không tìm thấy đề tài trong hội đồng này')
        }

        // Lấy tất cả điểm của scorer cho topic này (có thể có nhiều sinh viên)
        const scores = topic.scores?.filter((s) => s.scorerId.toString() === scorerId) || []

        if (scores.length === 0) {
            throw new NotFoundException('Không tìm thấy điểm đánh giá')
        }

        // Lấy evaluation template để có tên tiêu chí
        const template = await this.evaluationTemplateModel.findById(council.evaluationTemplateId).lean().exec()

        if (!template) {
            throw new NotFoundException('Không tìm thấy template đánh giá')
        }

        const html = await this.renderEvaluationFormTemplate(council, topic, scores, template)

        return await this.generatePdfFromHtml(html)
    }

    /**
     * Tạo biên bản hội đồng PDF với bảng điểm tổng kết
     */
    async generateCouncilMinutesPdf(councilId: string, topicId: string): Promise<Buffer> {
        const council = await this.defenseCouncilRepository.getCouncilById(councilId)

        const topic = council.topics.find((t) => t.topicId.toString() === topicId)
        if (!topic) {
            throw new NotFoundException('Không tìm thấy đề tài trong hội đồng này')
        }

        const html = await this.renderCouncilMinutesTemplate(council, topic)

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
     * Render template phiếu đánh giá chi tiết cho tất cả sinh viên
     */
    private async renderEvaluationFormTemplate(
        council: DefenseCouncil,
        topic: TopicAssignment,
        scores: Score[],
        template: any
    ): Promise<string> {
        const templatePath = path.join(__dirname, '../templates/evaluation-form.ejs')

        const roleLabels = {
            supervisor: 'Cán bộ hướng dẫn (GVHD)',
            reviewer: 'Cán bộ phản biện (GVPB)',
            secretary: 'Thư ký hội đồng',
            chairperson: 'Chủ tịch hội đồng',
            member: 'Ủy viên hội đồng'
        }
        // Lấy scorer info từ score đầu tiên
        const firstScore = scores[0]

        // Map criteria với điểm của từng sinh viên
        const criteriaWithScores = template.criteria.map((criterion: any) => {
            // Map subcriteria với điểm của từng sinh viên
            const subcriteriaWithScores = criterion.subcriteria?.map((subCriterion: any) => {
                // Lấy điểm của từng sinh viên cho subcriterion này
                const scoresForSub = topic.students.map((student) => {
                    const studentScore = scores.find(
                        (s) => !s.studentId || s.studentId.toString() === student.userId.toString()
                    )
                    if (!studentScore?.detailedScores) return null

                    const subScoreObj = studentScore.detailedScores.find(
                        (ds) => ds.criterionId === criterion.id && ds.subcriterionId === subCriterion.id
                    )
                    return subScoreObj?.score || null
                })

                return {
                    id: subCriterion.id,
                    name: subCriterion.name,
                    scores: scoresForSub,
                    maxScore: subCriterion.maxScore,
                    elos: subCriterion.elos
                }
            })

            // Tính tổng điểm criterion cho từng sinh viên (tổng các subcriteria)
            const criterionScores = topic.students.map((student, studentIndex) => {
                // Tổng các subcriteria scores của sinh viên này
                return (
                    subcriteriaWithScores?.reduce((sum, sub) => {
                        const score = sub.scores[studentIndex]
                        return sum + (score || 0)
                    }, 0) || 0
                )
            })

            return {
                id: criterion.id,
                category: criterion.category,
                maxScore: criterion.maxScore,
                elos: criterion.elos,
                scores: criterionScores, // Tổng điểm criterion cho từng sinh viên
                subcriteria: subcriteriaWithScores || []
            }
        })
        // Tính tổng điểm cho từng sinh viên
        const totalScores = topic.students.map((student) => {
            const studentScore = scores.find(
                (s) => !s.studentId || s.studentId.toString() === student.userId.toString()
            )
            return studentScore?.total || null
        })

        // Format scheduled date
        const scheduledDate = new Date(council.scheduledDate)
        const today = new Date()

        // Extract milestone and period info from aggregated data (if available)
        const facultyName =
            (council as any).periodInfo?.faculty?.name ||
            (council as any).period?.faculty?.name ||
            'Khoa Công nghệ Thông tin'
        return await ejs.renderFile(templatePath, {
            // Council info
            scheduledDate: scheduledDate.toLocaleDateString('vi-VN'),
            facultyName: facultyName,

            // Topic info
            topicTitle: topic.titleVN,
            topicTitleEng: topic.titleEng,
            students: topic.students,

            // Evaluator info
            titleName:
                topic.members.find((m) => m.memberId.toString() === firstScore.scorerId.toString())?.title || 'N/A',
            evaluatorName: firstScore.scorerName,
            evaluatorRole: roleLabels[firstScore.scoreType] || firstScore.scoreType,

            // Scores
            criteria: criteriaWithScores,
            totalScores: totalScores,
            comment: firstScore.comment || '',

            // Signature date
            signatureDate: {
                day: today.getDate(),
                month: today.getMonth() + 1,
                year: today.getFullYear()
            }
        })
    }

    /**
     * Render template biên bản hội đồng
     */
    private async renderCouncilMinutesTemplate(council: DefenseCouncil, topic: TopicAssignment): Promise<string> {
        const templatePath = path.join(__dirname, '../templates/council-minutes.ejs')

        const roleLabels = {
            supervisor: 'GVHD',
            reviewer: 'GVPB',
            secretary: 'Thư ký HĐ',
            chairperson: 'Chủ tịch HĐ',
            member: 'Ủy viên HĐ'
        }

        // Aggregate unique council members from all topics
        const memberMap = new Map<
            string,
            {
                memberId: string
                fullName: string
                title: string
                roles: Set<string>
            }
        >()

        council.topics.forEach((t) => {
            t.members?.forEach((member) => {
                if (!memberMap.has(member.memberId.toString())) {
                    memberMap.set(member.memberId.toString(), {
                        memberId: member.memberId.toString(),
                        fullName: member.fullName,
                        title: member.title || '',
                        roles: new Set([member.role])
                    })
                } else {
                    memberMap.get(member.memberId.toString())!.roles.add(member.role)
                }
            })
        })

        const aggregatedMembers = Array.from(memberMap.values()).map((m) => ({
            fullName: m.fullName,
            title: m.title,
            roles: Array.from(m.roles),
            roleLabels: Array.from(m.roles)
                .map((r) => roleLabels[r] || r)
                .join(', ')
        }))

        // Prepare all topics with their info
        const allTopicsInfo = council.topics.map((t, idx) => {
            const advisor = t.members?.find((m) => m.role === 'supervisor')
            const reviewer = t.members?.find((m) => m.role === 'reviewer')

            return {
                stt: t.defenseOrder || idx + 1,
                titleVN: t.titleVN,
                titleEng: t.titleEng,
                students: t.students.map((s) => `${s.fullName} (${s.studentCode})`).join(', '),
                advisorName: advisor ? `${advisor.title || ''} ${advisor.fullName}` : '--',
                reviewerName: reviewer ? `${reviewer.title || ''} ${reviewer.fullName}` : '--'
            }
        })

        // Collect all unique students from all topics
        const allStudentsMap = new Map<string, { userId: string; fullName: string; studentCode: string }>()
        council.topics.forEach((t) => {
            t.students?.forEach((student) => {
                if (!allStudentsMap.has(student.userId.toString())) {
                    allStudentsMap.set(student.userId.toString(), {
                        userId: student.userId.toString(),
                        fullName: student.fullName,
                        studentCode: student.studentCode!
                    })
                }
            })
        })
        const allStudents = Array.from(allStudentsMap.values()).map((s, idx) => ({
            stt: idx + 1,
            fullName: s.fullName,
            studentCode: s.studentCode
        }))

        // Lấy thông tin điểm cho từng sinh viên của topic được chọn (để hiển thị bảng điểm)
        const studentScores = topic.students.map((student, index) => {
            // Lấy điểm từ các scorer
            const advisorScore = topic.scores?.find(
                (s) => s.scoreType === ScoreType.SUPERVISOR && s.studentId?.toString() === student.userId
            )
            const reviewerScore = topic.scores?.find(
                (s) => s.scoreType === ScoreType.REVIEWER && s.studentId?.toString() === student.userId
            )
            const chairmanScore = topic.scores?.find(
                (s) => s.scoreType === ScoreType.CHAIRPERSON && s.studentId?.toString() === student.userId
            )
            const secretaryScore = topic.scores?.find(
                (s) => s.scoreType === ScoreType.SECRETARY && s.studentId?.toString() === student.userId
            )
            const memberScore = topic.scores?.find(
                (s) => s.scoreType === ScoreType.MEMBER && s.studentId?.toString() === student.userId
            )

            // Tính điểm tổng kết theo công thức: (CTHĐ + TKHĐ + CBHD×2 + CBPB×2) / 6
            const totalScore =
                (chairmanScore?.total || 0) +
                (secretaryScore?.total || 0) +
                (advisorScore?.total || 0) * 2 +
                (reviewerScore?.total || 0) * 2
            const finalScore = (totalScore / 6).toFixed(2)

            return {
                stt: index + 1,
                fullName: student.fullName,
                studentCode: student.studentCode,
                advisorScore: advisorScore?.total?.toFixed(2) || '--',
                reviewerScore: reviewerScore?.total?.toFixed(2) || '--',
                chairmanScore: chairmanScore?.total?.toFixed(2) || '--',
                secretaryScore: secretaryScore?.total?.toFixed(2) || '--',
                memberScore: memberScore?.total?.toFixed(2) || '--',
                finalScore
            }
        })

        // Format dates
        const scheduledDate = new Date(council.scheduledDate)
        const today = new Date()

        // Extract milestone and period info
        const facultyName =
            (council as any).periodInfo?.faculty?.name ||
            (council as any).period?.faculty?.name ||
            'Khoa Công nghệ Thông tin'

        const milestone = (council as any).milestone || (council as any).milestoneInfo
        const period = (council as any).period || (council as any).periodInfo

        return await ejs.renderFile(templatePath, {
            // Council info
            councilName: council.name,
            location: council.location,
            scheduledDate: scheduledDate.toLocaleDateString('vi-VN'),
            scheduledTime: scheduledDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            facultyName: facultyName,
            batch: milestone?.title || 'Đợt bảo vệ',
            academicYear: period?.academicYear || '2023-2024',

            // Council members (aggregated from all topics)
            councilMembers: aggregatedMembers,

            // All topics info
            allTopics: allTopicsInfo,

            // All students (unique from all topics)
            allStudents: allStudents,

            // Council comments
            councilComments: council.councilComments || '',

            // Topic info (for backward compatibility)
            topicTitle: topic.titleVN,
            topicTitleEng: topic.titleEng,
            defenseOrder: topic.defenseOrder,
            students: topic.students,

            // Scores
            studentScores,

            // Signature date
            signatureDate: {
                day: today.getDate(),
                month: today.getMonth() + 1,
                year: today.getFullYear()
            }
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
