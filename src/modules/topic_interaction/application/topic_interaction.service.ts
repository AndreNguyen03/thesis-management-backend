import { Inject, Injectable } from '@nestjs/common'
import { TopicInteractionRepositoryInterface } from '../repository/topic_interaction.interface.repository'
import { TopicInteraction } from '../schema/topic_interaction.schema'
import { Types } from 'mongoose'

@Injectable()
export class TopicInteractionService {
    constructor(
        @Inject('TOPIC_INTERACTION_REPOSITORY')
        private readonly interactionRepo: TopicInteractionRepositoryInterface
    ) {}

    async logInteraction(userId: string, topicId: string, action: string) {
        if (action === 'view') {
            // Kiểm tra xem user đã xem trong vòng 10 phút chưa
            // (Frontend đã đảm bảo chỉ gọi API sau khi xem ít nhất 2 phút)
            const existed = await this.interactionRepo.findRecentView(userId, topicId, 10)
            if (existed) return
        }

        await this.interactionRepo.create({
            userId,
            topicId,
            action
        })
    }

    async getInteractionsByTopic(topicId: string): Promise<TopicInteraction[]> {
        return this.interactionRepo.getInteractionsByTopic(topicId)
    }

    async getAggregatedInteractions(
        topicIds: Types.ObjectId[]
    ): Promise<{ topicId: string; interactionCount: number; weightedScore: number }[]> {
        return this.interactionRepo.getAggregatedInteractions(topicIds)
    }
}
