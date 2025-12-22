import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { TopicInteraction } from '../schema/topic_interaction.schema'
import { Types } from 'mongoose'

export interface TopicInteractionRepositoryInterface extends BaseRepositoryInterface<TopicInteraction> {
    findRecentView(userId: string, topicId: string, minutes: number): Promise<TopicInteraction | null>
    getInteractionsByTopic(topicId: string): Promise<TopicInteraction[]>
    getAggregatedInteractions(
        topicIds: Types.ObjectId[]
    ): Promise<{ topicId: string; interactionCount: number; weightedScore: number }[]>
}
