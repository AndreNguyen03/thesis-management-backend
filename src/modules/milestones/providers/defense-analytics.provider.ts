import { Injectable } from '@nestjs/common'
import { DefenseCouncilRepository } from '../repository/defense-council.repository'
import { DefenseCouncil, TopicAssignment } from '../schemas/defense-council.schema'

export interface CouncilAnalytics {
    overview: {
        totalTopics: number
        completedTopics: number
        averageScore: number
        highestScore: number
        lowestScore: number
        completionRate: number
    }
    gradeDistribution: {
        xuatSac: number
        gioi: number
        kha: number
        trungBinh: number
        yeu: number
        kem: number
    }
    scoresByRole: {
        supervisor: { avg: number; min: number; max: number }
        reviewer: { avg: number; min: number; max: number }
        secretary: { avg: number; min: number; max: number }
        chairperson: { avg: number; min: number; max: number }
        member: { avg: number; min: number; max: number }
    }
    timeline: {
        createdAt: Date
        completedAt?: Date
        publishedAt?: Date
        durationDays?: number
    }
    topPerformers: Array<{
        topicId: string
        titleVN: string
        studentNames: string[]
        finalScore: number
        gradeText: string
    }>
}

export interface PeriodAnalytics {
    totalCouncils: number
    totalTopics: number
    averageScoreAcrossPeriod: number
    gradeDistribution: {
        xuatSac: number
        gioi: number
        kha: number
        trungBinh: number
        yeu: number
        kem: number
    }
    councilComparison: Array<{
        councilId: string
        name: string
        averageScore: number
        topicsCount: number
        completionRate: number
    }>
}

@Injectable()
export class DefenseAnalyticsProvider {
    constructor(private readonly defenseCouncilRepository: DefenseCouncilRepository) {}

    /**
     * Lấy thống kê chi tiết cho một hội đồng
     */
    async getCouncilAnalytics(councilId: string): Promise<CouncilAnalytics> {
        const council = await this.defenseCouncilRepository.getCouncilById(councilId)

        const topics = council.topics
        const completedTopics = topics.filter((t) => t.scores && t.scores.length > 0)
        const scores = topics.map((t) => t.finalScore).filter((s) => s !== undefined && s !== null)

        return {
            overview: {
                totalTopics: topics.length,
                completedTopics: completedTopics.length,
                averageScore: this.calculateAverage(scores),
                highestScore: scores.length > 0 ? Math.max(...scores) : 0,
                lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
                completionRate: topics.length > 0 ? (completedTopics.length / topics.length) * 100 : 0
            },
            gradeDistribution: this.getGradeDistribution(topics),
            scoresByRole: this.analyzeScoresByRole(topics),
            timeline: this.getTimeline(council),
            topPerformers: this.getTopPerformers(topics, 5)
        }
    }

    /**
     * Lấy thống kê cho cả kỳ (tất cả hội đồng trong một milestone)
     */
    async getPeriodAnalytics(milestoneTemplateId: string): Promise<PeriodAnalytics> {
        const councils = await this.defenseCouncilRepository
            .getCouncils({
                milestoneTemplateId,
                page: 1,
                limit: 1000 // Get all councils
            })
            .then((result) => result.data)

        const allTopics = councils.flatMap((c: any) => c.topics || [])
        const allScores = allTopics.map((t: any) => t.finalScore).filter((s: number) => s !== undefined && s !== null)

        return {
            totalCouncils: councils.length,
            totalTopics: allTopics.length,
            averageScoreAcrossPeriod: this.calculateAverage(allScores),
            gradeDistribution: this.getGradeDistribution(allTopics),
            councilComparison: councils.map((c: any) => ({
                councilId: c._id.toString(),
                name: c.name,
                averageScore: this.calculateAverage(
                    c.topics.map((t: any) => t.finalScore).filter((s: number) => s !== undefined)
                ),
                topicsCount: c.topics?.length || 0,
                completionRate:
                    c.topics?.length > 0
                        ? (c.topics.filter((t: any) => t.scores && t.scores.length > 0).length / c.topics.length) * 100
                        : 0
            }))
        }
    }

    /**
     * Tính điểm trung bình
     */
    private calculateAverage(scores: number[]): number {
        if (scores.length === 0) return 0
        return Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100
    }

    /**
     * Phân tích điểm theo từng vai trò
     */
    private analyzeScoresByRole(topics: TopicAssignment[]) {
        const roleTypes = ['supervisor', 'reviewer', 'secretary', 'chairperson', 'member']
        const result: any = {}

        roleTypes.forEach((role) => {
            const roleScores = topics
                .flatMap((t) => t.scores)
                .filter((s) => s.scoreType === role)
                .map((s) => s.total)

            result[role] = {
                avg: this.calculateAverage(roleScores),
                min: roleScores.length > 0 ? Math.min(...roleScores) : 0,
                max: roleScores.length > 0 ? Math.max(...roleScores) : 0
            }
        })

        return result
    }

    /**
     * Lấy phân bố xếp loại
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
     * Lấy timeline của hội đồng
     */
    private getTimeline(council: any) {
        const timeline: any = {
            createdAt: council.created_at || council.createdAt
        }

        if (council.completedAt) {
            timeline.completedAt = council.completedAt
            const createdDate = council.created_at || council.createdAt
            const durationMs = new Date(council.completedAt).getTime() - new Date(createdDate).getTime()
            timeline.durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24))
        }

        if (council.publishedAt) {
            timeline.publishedAt = council.publishedAt
        }

        return timeline
    }

    /**
     * Lấy top N đề tài có điểm cao nhất
     */
    private getTopPerformers(topics: TopicAssignment[], limit: number = 5) {
        return topics
            .filter((t) => t.finalScore !== undefined && t.finalScore !== null)
            .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
            .slice(0, limit)
            .map((t) => ({
                topicId: t.topicId.toString(),
                titleVN: t.titleVN,
                studentNames: t.studentNames,
                finalScore: t.finalScore || 0,
                gradeText: t.gradeText || ''
            }))
    }
}
