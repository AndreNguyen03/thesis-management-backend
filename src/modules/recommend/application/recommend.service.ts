// application/recommendation.service.ts
import { Injectable, Logger } from '@nestjs/common'
import { ContentBasedPipeline } from '../pipelines/content-based-v2.pipeline'
import { RecommendationResult } from '../dto/recommendation-response.dto'

export interface RecommendationResponse {
    success: boolean
    data?: RecommendationResult[]
    message?: string
    metadata?: {
        totalTopics: number
        recommendationsCount: number
        processingTime: number
        profileStatus: 'complete' | 'incomplete' | 'error'
    }
}

@Injectable()
export class RecommendationService {
    private readonly logger = new Logger(RecommendationService.name)

    constructor(private readonly pipeline: ContentBasedPipeline) {}

    async getRecommendationsForStudent(
        studentId: string,
        periodId: string,
        options?: { limit?: number }
    ): Promise<RecommendationResponse> {
        const startTime = Date.now()

        try {
            this.logger.log(`Getting recommendations for student ${studentId}`)

            const results = await this.pipeline.runPipeline(studentId, periodId)

            const limitedResults = options?.limit ? results.slice(0, options.limit) : results

            return {
                success: true,
                data: limitedResults,
                metadata: {
                    totalTopics: results.length,
                    recommendationsCount: limitedResults.length,
                    processingTime: Date.now() - startTime,
                    profileStatus: 'complete'
                }
            }
        } catch (error) {
            this.logger.error(`Failed to get recommendations for ${studentId}: ${error.message}`)

            return {
                success: false,
                message: 'Không thể tạo đề xuất. Vui lòng thử lại sau.',
                metadata: {
                    totalTopics: 0,
                    recommendationsCount: 0,
                    processingTime: Date.now() - startTime,
                    profileStatus: 'error'
                }
            }
        }
    }

    async getTopicRecommendation(
        studentId: string,
        topicId: string,
        periodId: string
    ): Promise<RecommendationResponse> {
        const allRecs = await this.getRecommendationsForStudent(studentId, periodId)

        if (!allRecs.success || !allRecs.data?.length) {
            return {
                success: false,
                message: allRecs.message || 'Không có đề xuất nào',
                metadata: allRecs.metadata
            }
        }

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
    }
}
