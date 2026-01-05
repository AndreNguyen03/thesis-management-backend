// pipeline/content-based.pipeline.ts
import { Injectable, Logger } from '@nestjs/common'
import { StudentProfileDto } from '../../../users/dtos/student.dto'
import { CandidateTopicDto } from '../../topics/dtos/candidate-topic.dto'
import { StudentService } from '../../../users/application/student.service'
import { GetEmbeddingProvider } from '../../chatbot/application/get-embedding.provider'
import { StudentSummaryBuilderService } from '../services/student-summary-builder.service'
import { TopicSearchService } from '../../topic_search/application/search.service'
import { RecommendationResult, TopicVectorSearch } from '../dto/recommendation-response.dto'
import { SearchSimilarTopicsProvider } from '../../knowledge-source/application/search-similar-topics.provider'
import { TopicStatus } from '../../topics/enum'
import { CacheService } from '../../../redis/providers/cache.service'
import { CACHE_TTL } from '../../../redis/constants/cache.constants'

@Injectable()
export class ContentBasedPipeline {
    private readonly logger = new Logger(ContentBasedPipeline.name)

    constructor(
        private readonly studentService: StudentService,
        private readonly embeddingProvider: GetEmbeddingProvider,
        private readonly studentSummaryBuilder: StudentSummaryBuilderService,
        private readonly cacheService: CacheService,
        private readonly topicSearchService: TopicSearchService,
        private readonly searchSimilarTopicProvider: SearchSimilarTopicsProvider
    ) {}

    /**
     * Main pipeline - 8 bước
     */
    async runPipeline(studentId: string, periodId: string): Promise<RecommendationResult[]> {
        this.logger.log(`[PIPELINE START] studentId=${studentId}, periodId=${periodId}`)

        const startTime = Date.now()
        // BƯỚC 1: Lấy dữ liệu VÀ VALIDATE PROFILE
        const [studentProfile, candidateTopics] = await this.loadData(studentId, periodId)

        this.logger.debug(
            `[STEP 1] Loaded data: profile=${!!studentProfile}, topicsCount=${candidateTopics?.length ?? 0}`
        )

        // VALIDATION: Kiểm tra profile có đủ thông tin không
        if (!this.isProfileValidForRecommendation(studentProfile)) {
            this.logger.warn(`Student ${studentId} has incomplete profile, using fallback`)
            const fallbackResults = this.getFallbackRecommendations(candidateTopics || [])
            return fallbackResults
        }

        if (!studentProfile || !candidateTopics || candidateTopics.length === 0) {
            return this.getFallbackRecommendations(candidateTopics || [])
        }

        // BƯỚC 2: Tạo summaries (chỉ khi có đủ data)
        const studentSemanticSummary = this.studentSummaryBuilder.buildSemanticSummary(studentProfile)

        // VALIDATION: Kiểm tra summaries có đủ nội dung
        if (!this.isSummaryValid(studentSemanticSummary)) {
            this.logger.warn(`Student ${studentId} has insufficient summary content, using fallback`)
            this.logger.warn(`[STEP 3] Invalid summary detected → fallback`)
            return this.getFallbackRecommendations(candidateTopics)
        }

        const studentEmbedding = await this.getCachedStudentEmbedding(
            studentId,
            studentProfile.updatedAt,
            studentSemanticSummary
        )

        // BƯỚC 3: Semantic scoring
        const semanticScoredTopics = await this.performSemanticScoring(periodId, studentEmbedding)

        this.logger.log(`[PIPELINE END] studentId=${studentId}, duration=${Date.now() - startTime}ms`)
        // Assign ranks
        return semanticScoredTopics.map((result, index) => {
            return {
                topic: result,
                type: 'recommend',
                rank: index + 1
            }
        })
    }

    /**
     * BƯỚC 1: Load data với validation
     */
    private async loadData(
        studentId: string,
        periodId: string
    ): Promise<[StudentProfileDto | null, CandidateTopicDto[]]> {
        try {
            this.logger.debug(`[LOAD DATA] Fetching studentProfile & candidateTopics`)

            const [studentProfile, candidateTopics] = await Promise.all([
                this.studentService.getStudentProfile(studentId),
                // this.topicService.getCandidateTopics()
                this.topicSearchService.getPendingRegistrationTopics(periodId)
            ])

            this.logger.debug(
                `[LOAD DATA RESULT] studentProfile=${!!studentProfile}, candidateTopics=${candidateTopics?.length ?? 0}`
            )
            // VALIDATION: Kiểm tra profile có tồn tại không
            if (!studentProfile) {
                this.logger.error(`Student ${studentId} not found`)

                return [null, candidateTopics || []]
            }

            return [studentProfile, candidateTopics || []]
        } catch (error) {
            this.logger.error(`Failed to load data: ${error.message}`)
            return [null, []]
        }
    }

    /**
     * VALIDATION: Kiểm tra profile có đủ thông tin cho recommendation
     */
    private isProfileValidForRecommendation(profile: StudentProfileDto | null): boolean {
        if (!profile) return false

        // Cần ít nhất một trong các field sau:
        const hasSkills = profile.skills && profile.skills.length > 0
        const hasInterests = profile.interests && profile.interests.length > 0
        const hasBio = profile.bio && profile.bio.trim().length > 20

        // Cần ít nhất 2 trong 3 field trên
        const validFieldsCount = [hasSkills, hasInterests, hasBio].filter(Boolean).length
        if (validFieldsCount < 2) {
            this.logger.debug(
                `Profile validation failed: skills=${hasSkills}, interests=${hasInterests}, bio=${hasBio}`
            )
            return false
        }

        return true
    }

    /**
     * VALIDATION: Kiểm tra summary có đủ nội dung
     */
    private isSummaryValid(summary: string): boolean {
        if (!summary) return false

        // Loại bỏ whitespace và đếm từ
        const wordCount = summary
            .trim()
            .split(/\s+/)
            .filter((word) => word.length > 2).length

        // Cần ít nhất 5 từ có ý nghĩa
        return wordCount >= 5
    }

    /**
     * BƯỚC 4: Semantic scoring
     */
    private async performSemanticScoring(
        periodId: string,
        studentEmbedding: number[]
    ): Promise<Array<TopicVectorSearch>> {
        try {
            const scoredTopics = await this.searchSimilarTopicProvider.searchSimilarTopics(studentEmbedding, periodId)

            this.logger.debug(
                `[STEP 4] Top semantic scores: ${scoredTopics
                    .slice(0, 5)
                    .map((t) => `${t.titleVN}:${t.score.toFixed(3)}`)
                    .join(' | ')}`
            )
            return scoredTopics
        } catch (error) {
            this.logger.error(`Semantic scoring failed: ${error.message}`)
            return []
        }
    }

    /**
     * Fallback recommendations khi profile không đủ thông tin
     */
    private getFallbackRecommendations(topics: CandidateTopicDto[]): RecommendationResult[] {
        this.logger.warn('Using fallback recommendations')

        const validTopics = topics.filter(
            (topic) =>
                topic.currentStatus === TopicStatus.PendingRegistration ||
                topic.currentStatus === TopicStatus.Registered
        )

        if (validTopics.length === 0) {
            this.logger.error('No open topics available for fallback')
            return []
        }

        return validTopics
            .sort((a, b) => {
                // Ưu tiên đề tài có nhiều thông tin hơn
                const aReqCount = a.requirements?.length || 0
                const bReqCount = b.requirements?.length || 0
                return bReqCount - aReqCount
            })
            .slice(0, 5)
            .map((topic, index) => {
                const { embedding, ...topicWithoutEmbedding } = topic
                return {
                    topic: topicWithoutEmbedding,
                    type: 'fallback',
                    semanticScore: 0.4, // neutral score
                    badges: [
                        {
                            type: 'fallback',
                            label: 'Đề xuất phổ biến',
                            color: 'blue',
                            icon: 'Info',
                            tooltip: 'Đề xuất khi hồ sơ chưa đủ dữ liệu',
                            priority: 5
                        },
                        {
                            type: 'profile_incomplete',
                            label: 'Cần cập nhật hồ sơ',
                            color: 'orange',
                            icon: 'AlertCircle',
                            tooltip: 'Cập nhật skills, interests để có đề xuất chính xác hơn',
                            priority: 1
                        }
                    ],
                    badgeSummary: 'Đề xuất phổ biến do hồ sơ chưa đầy đủ',
                    rank: index + 1
                }
            })
    }

    private async getCachedStudentEmbedding(
        studentId: string,
        profileUpdatedAt: Date,
        studentSemanticSummary: string
    ): Promise<number[]> {
        const cacheKey = `student_embedding:${studentId}:${profileUpdatedAt.getTime()}`

        return this.cacheService.getOrSet<number[]>(
            cacheKey,
            async () => {
                this.logger.debug(`[EMBEDDING] Cache MISS → generating embedding`)
                return this.embeddingProvider.getEmbedding(studentSemanticSummary)
            },
            CACHE_TTL.LONG
        )
    }
}
