// pipeline/content-based.pipeline.ts
import { Injectable, Logger } from '@nestjs/common'
import { StudentProfileDto } from '../../../users/dtos/student.dto'
import { CandidateTopicDto } from '../../topics/dtos/candidate-topic.dto'
import { TopicService } from '../../topics/application/topic.service'
import { StudentService } from '../../../users/application/student.service'
import { GetEmbeddingProvider } from '../../chatbot/application/get-embedding.provider'
import { StudentSummaryBuilderService } from '../services/student-summary-builder.service'
import { TopicEnhancerService } from '../services/topic-enhancer.service'
import { RerankerService } from '../services/reranker.service'
import { AdaptiveWeightsService } from '../services/adaptive-weights.service'
import { DynamicThresholdService } from '../services/dynamic-threshold.service'
import { BadgeGeneratorService } from '../services/bagde-generator.service'

@Injectable()
export class ContentBasedPipeline {
    private readonly logger = new Logger(ContentBasedPipeline.name)

    constructor(
        private readonly topicService: TopicService,
        private readonly studentService: StudentService,
        private readonly embeddingProvider: GetEmbeddingProvider,
        private readonly studentSummaryBuilder: StudentSummaryBuilderService,
        private readonly topicEnhancer: TopicEnhancerService,
        private readonly reranker: RerankerService,
        private readonly badgeGenerator: BadgeGeneratorService,
        private readonly adaptiveWeights: AdaptiveWeightsService,
        private readonly dynamicThreshold: DynamicThresholdService
    ) {}

    /**
     * Main pipeline - 8 bước
     */
    async runPipeline(studentId: string): Promise<any[]> {
        this.logger.log(`🚀 Starting pipeline for student ${studentId}`)

        // BƯỚC 1: Lấy dữ liệu VÀ VALIDATE PROFILE
        const [studentProfile, candidateTopics] = await this.loadData(studentId)

        // VALIDATION: Kiểm tra profile có đủ thông tin không
        if (!this.isProfileValidForRecommendation(studentProfile)) {
            this.logger.warn(`Student ${studentId} has incomplete profile, using fallback`)
            return this.getFallbackRecommendations(candidateTopics || [])
        }

        if (!studentProfile || !candidateTopics || candidateTopics.length === 0) {
            return this.getFallbackRecommendations(candidateTopics || [])
        }

        // BƯỚC 2: Phân tích profile
        const profileCompleteness = this.adaptiveWeights.calculateProfileCompleteness(studentProfile)
        const adaptiveWeights = this.adaptiveWeights.calculateAdaptiveWeights(profileCompleteness)

        // BƯỚC 3: Tạo summaries (chỉ khi có đủ data)
        const studentSemanticSummary = this.studentSummaryBuilder.buildSemanticSummary(studentProfile)
        const studentLexicalSummary = this.studentSummaryBuilder.buildLexicalSummary(studentProfile)

        // VALIDATION: Kiểm tra summaries có đủ nội dung
        if (!this.isSummaryValid(studentSemanticSummary) || !this.isSummaryValid(studentLexicalSummary)) {
            this.logger.warn(`Student ${studentId} has insufficient summary content, using fallback`)
            return this.getFallbackRecommendations(candidateTopics)
        }

        // BƯỚC 4: Semantic scoring
        const semanticScoredTopics = await this.performSemanticScoring(candidateTopics, studentSemanticSummary)

        // BƯỚC 5: Chọn topics để rerank
        const rerankCandidates = this.dynamicThreshold.selectRerankCandidates(
            semanticScoredTopics.map((t) => ({ score: t.semanticScore, ...t })),
            5, // min candidates
            25 // max candidates
        )

        // BƯỚC 6: Lexical reranking
        const rerankScores = await this.reranker.rerank(
            rerankCandidates.map((c) => c.topicSummary),
            studentLexicalSummary
        )

        // BƯỚC 7: Kết hợp scores
        const combinedResults = this.combineScores(
            rerankCandidates,
            rerankScores.scores,
            adaptiveWeights,
            profileCompleteness
        )

        // Sort by final score
        combinedResults.sort((a, b) => b.metrics.finalScore - a.metrics.finalScore)

        // BƯỚC 8: Tạo badges & final ranking
        const topResults = combinedResults.slice(0, 10)
        const finalResults = await this.enrichWithBadges(topResults, studentProfile)

        // Assign ranks
        return finalResults.map((result, index) => ({
            ...result,
            rank: index + 1
        }))
    }

    /**
     * BƯỚC 1: Load data với validation
     */
    private async loadData(studentId: string): Promise<[StudentProfileDto | null, CandidateTopicDto[]]> {
        try {
            const [studentProfile, candidateTopics] = await Promise.all([
                this.studentService.getStudentProfile(studentId),
                this.topicService.getCandidateTopics()
            ])

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
        topics: CandidateTopicDto[],
        studentSemanticSummary: string
    ): Promise<Array<{ topic: CandidateTopicDto; topicSummary: string; semanticScore: number }>> {
        try {
            // Get student embedding
            const studentEmbedding = await this.embeddingProvider.getEmbedding(studentSemanticSummary)

            const scoredTopics: { topic: CandidateTopicDto; topicSummary: string; semanticScore: number }[] = []

            for (const topic of topics) {
                // Get topic embedding
                const topicSummary = this.topicEnhancer.buildTopicSummary(topic)
                const topicEmbedding = await this.embeddingProvider.getEmbedding(topicSummary)

                // Calculate cosine similarity
                const semanticScore = this.cosineSimilarity(studentEmbedding, topicEmbedding)

                scoredTopics.push({
                    topic,
                    topicSummary: this.topicEnhancer.buildLexicalSummary(topic),
                    semanticScore
                })
            }

            return scoredTopics
        } catch (error) {
            this.logger.error(`Semantic scoring failed: ${error.message}`)

            // Fallback: trả về scores random nhưng thấp
            return topics.map((topic) => ({
                topic,
                topicSummary: this.topicEnhancer.buildLexicalSummary(topic),
                semanticScore: 0.3 + Math.random() * 0.2 // Random từ 0.3-0.5
            }))
        }
    }

    /**
     * Helper: cosine similarity
     */
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0)
        const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0))
        const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0))

        if (magnitudeA === 0 || magnitudeB === 0) return 0
        return dotProduct / (magnitudeA * magnitudeB)
    }

    /**
     * BƯỚC 7: Combine scores
     */
    private combineScores(
        candidates: Array<{ topic: CandidateTopicDto; semanticScore: number }>,
        rerankScores: number[],
        adaptiveWeights: { semanticWeight: number; lexicalWeight: number; reasoning: string },
        profileCompleteness: number
    ) {
        return candidates.map((candidate, index) => {
            const semanticScore = candidate.semanticScore
            const lexicalScore = rerankScores[index] || 0

            // Apply adaptive weights
            const finalScore =
                semanticScore * adaptiveWeights.semanticWeight + lexicalScore * adaptiveWeights.lexicalWeight

            // Calculate confidence
            const confidence = this.calculateConfidence(semanticScore, lexicalScore, profileCompleteness)

            return {
                topic: candidate.topic,
                metrics: {
                    semanticScore,
                    lexicalScore,
                    finalScore: Math.min(Math.max(finalScore, 0), 1.0), // Clamp 0-1
                    confidence,
                    profileCompleteness,
                    adaptiveWeights
                }
            }
        })
    }

    /**
     * BƯỚC 8: Enrich with badges
     */
    private async enrichWithBadges(
        results: Array<{ topic: CandidateTopicDto; metrics: any }>,
        studentProfile: StudentProfileDto
    ) {
        const enrichedPromises = results.map(async (result) => {
            try {
                const badgeResult = await this.badgeGenerator.generateBadges(
                    result.topic,
                    studentProfile,
                    result.metrics.semanticScore,
                    result.metrics.lexicalScore
                )

                return {
                    ...result,
                    badges: badgeResult.displayBadges,
                    badgeSummary: badgeResult.badgeSummary,
                    allBadges: badgeResult.allBadges // Giữ lại cho debugging
                }
            } catch (error) {
                this.logger.error(`Failed to generate badges for topic ${result.topic._id}: ${error.message}`)

                // Fallback badges
                return {
                    ...result,
                    badges: [
                        {
                            type: 'error',
                            label: 'Không có thông tin',
                            color: 'gray',
                            icon: 'Info',
                            tooltip: 'Không thể tạo badges',
                            priority: 5
                        }
                    ],
                    badgeSummary: 'Thông tin hạn chế',
                    allBadges: []
                }
            }
        })

        return await Promise.all(enrichedPromises)
    }

    /**
     * Helper: Calculate confidence
     */
    private calculateConfidence(
        semanticScore: number,
        lexicalScore: number,
        profileCompleteness: number
    ): 'high' | 'medium' | 'low' {
        const combined = semanticScore * 0.6 + lexicalScore * 0.4

        if (profileCompleteness > 0.7 && combined > 0.7) return 'high'
        if (combined > 0.5) return 'medium'
        return 'low'
    }

    /**
     * Fallback recommendations khi profile không đủ thông tin
     */
    private getFallbackRecommendations(topics: CandidateTopicDto[]): any[] {
        this.logger.warn('Using fallback recommendations')

        const validTopics = topics.filter((topic) => topic.currentStatus?.toLowerCase() === 'open')

        if (validTopics.length === 0) {
            this.logger.error('No open topics available for fallback')
            return []
        }

        return validTopics
            .sort((a, b) => {
                // Ưu tiên topics có nhiều requirements (có thể đầy đủ thông tin hơn)
                const aReqCount = a.requirements?.length || 0
                const bReqCount = b.requirements?.length || 0
                return bReqCount - aReqCount
            })
            .slice(0, 5)
            .map((topic, index) => ({
                topic,
                metrics: {
                    semanticScore: 0.5,
                    lexicalScore: 0.5,
                    finalScore: 0.5,
                    confidence: 'medium' as const,
                    profileCompleteness: 0.5,
                    adaptiveWeights: {
                        semanticWeight: 0.8,
                        lexicalWeight: 0.2,
                        reasoning: 'Fallback mode - insufficient profile data'
                    }
                },
                badges: [
                    {
                        type: 'fallback',
                        label: 'Đề xuất phổ biến',
                        color: 'blue' as const,
                        icon: 'Info',
                        tooltip: 'Đề xuất dựa trên độ phổ biến và trạng thái mở',
                        priority: 5
                    },
                    {
                        type: 'profile_incomplete',
                        label: 'Cần cập nhật profile',
                        color: 'orange' as const,
                        icon: 'AlertCircle',
                        tooltip: 'Cần cập nhật skills, interests hoặc bio để có đề xuất tốt hơn',
                        priority: 1
                    }
                ],
                badgeSummary: 'Đề xuất phổ biến (cần cập nhật profile)',
                allBadges: [],
                rank: index + 1
            }))
    }

    /**
     * Method để kiểm tra profile completeness (cho frontend/test)
     */
    async checkProfileCompleteness(studentId: string): Promise<{
        isValid: boolean
        completeness: number
        missingFields: string[]
        suggestions: string[]
    }> {
        try {
            const studentProfile = await this.studentService.getStudentProfile(studentId)

            if (!studentProfile) {
                return {
                    isValid: false,
                    completeness: 0,
                    missingFields: ['profile_not_found'],
                    suggestions: ['Tạo profile sinh viên']
                }
            }

            const missingFields: string[] = []
            const suggestions: string[] = []

            // Kiểm tra skills
            if (!studentProfile.skills || studentProfile.skills.length === 0) {
                missingFields.push('skills')
                suggestions.push('Thêm ít nhất 3 kỹ năng (ví dụ: React, Python, AI)')
            } else if (studentProfile.skills.length < 3) {
                suggestions.push('Thêm nhiều kỹ năng hơn để có đề xuất tốt hơn')
            }

            // Kiểm tra interests
            if (!studentProfile.interests || studentProfile.interests.length === 0) {
                missingFields.push('interests')
                suggestions.push('Thêm ít nhất 2 sở thích (ví dụ: Machine Learning, Web Development)')
            } else if (studentProfile.interests.length < 2) {
                suggestions.push('Thêm nhiều sở thích hơn để có đề xuất tốt hơn')
            }

            // Kiểm tra bio
            if (!studentProfile.bio || studentProfile.bio.trim().length < 20) {
                missingFields.push('bio')
                suggestions.push('Thêm mô tả bản thân (ít nhất 20 ký tự)')
            }

            const completeness = this.adaptiveWeights.calculateProfileCompleteness(studentProfile)
            const isValid = this.isProfileValidForRecommendation(studentProfile)

            return {
                isValid,
                completeness,
                missingFields,
                suggestions: suggestions.length > 0 ? suggestions : ['Profile đã đầy đủ!']
            }
        } catch (error) {
            this.logger.error(`Failed to check profile completeness: ${error.message}`)
            return {
                isValid: false,
                completeness: 0,
                missingFields: ['error'],
                suggestions: ['Không thể kiểm tra profile']
            }
        }
    }
}
