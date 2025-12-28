// application/recommendation.service.ts
import { Injectable, Logger } from '@nestjs/common'
import { ContentBasedPipeline } from '../pipelines/content-based-v2.pipeline'

export interface RecommendationResponse {
    success: boolean
    data?: Array<{
        topic: any
        metrics: {
            semanticScore: number
            lexicalScore: number
            finalScore: number
            confidence: 'high' | 'medium' | 'low'
            profileCompleteness: number
            adaptiveWeights: {
                semantic: number
                lexical: number
                reasoning: string
            }
        }
        badges: Array<{
            type: string
            label: string
            color: string
            icon: string
            tooltip: string
        }>
        badgeSummary: string
        rank: number
    }>
    message?: string
    metadata?: {
        totalTopics: number
        rerankedTopics: number
        recommendationsCount: number
        processingTime: number
        profileStatus: 'complete' | 'incomplete' | 'error'
    }
}

@Injectable()
export class RecommendationService {
    private readonly logger = new Logger(RecommendationService.name)

    constructor(private readonly pipeline: ContentBasedPipeline) {}

    /**
     * Get personalized topic recommendations
     */
    async getRecommendationsForStudent(
        studentId: string,
        periodId: string,
        options?: {
            limit?: number
        }
    ): Promise<RecommendationResponse> {
        const startTime = Date.now()

        try {
            this.logger.log(`Getting recommendations for student ${studentId}`)

            // Run pipeline
            const pipelineResults = await this.pipeline.runPipeline(studentId, periodId)

            // Apply limit if specified
            const limitedResults = options?.limit ? pipelineResults.slice(0, options.limit) : pipelineResults

            // Build response
            const response: RecommendationResponse = {
                success: true,
                data: limitedResults,
                metadata: {
                    totalTopics: pipelineResults.length,
                    rerankedTopics: Math.min(pipelineResults.length, 25), // approximate
                    recommendationsCount: limitedResults.length,
                    processingTime: Date.now() - startTime,
                    profileStatus: 'complete'
                }
            }

            this.logger.log(
                `Generated ${limitedResults.length} recommendations for ${studentId} in ${Date.now() - startTime}ms`
            )

            return response
        } catch (error) {
            this.logger.error(`Failed to get recommendations for ${studentId}: ${error.message}`)

            return {
                success: false,
                message: 'Không thể tạo đề xuất. Vui lòng thử lại sau.',
                metadata: {
                    totalTopics: 0,
                    rerankedTopics: 0,
                    recommendationsCount: 0,
                    processingTime: Date.now() - startTime,
                    profileStatus: 'error'
                }
            }
        }
    }

    /**
     * Get recommendation for specific topic
     */
    async getTopicRecommendation(
        studentId: string,
        topicId: string,
        periodId: string
    ): Promise<RecommendationResponse> {
        try {
            // Get all recommendations first
            const allRecs = await this.getRecommendationsForStudent(studentId, periodId)

            // FIX: Check if data exists
            if (!allRecs.success || !allRecs.data || allRecs.data.length === 0) {
                return {
                    success: false,
                    message: allRecs.message || 'Không tìm thấy đề xuất nào',
                    metadata: allRecs.metadata
                }
            }

            // Find specific topic
            const topicRec = allRecs.data.find((rec) => rec.topic._id === topicId)

            if (!topicRec) {
                return {
                    success: false,
                    message: 'Không tìm thấy đề tài trong danh sách đề xuất',
                    metadata: allRecs.metadata
                }
            }

            return {
                success: true,
                data: [topicRec],
                metadata: allRecs.metadata
            }
        } catch (error) {
            this.logger.error(`Failed to get topic recommendation: ${error.message}`)
            return {
                success: false,
                message: error.message || 'Có lỗi xảy ra khi lấy đề xuất cho đề tài'
            }
        }
    }
}
