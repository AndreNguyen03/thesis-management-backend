import { Injectable } from '@nestjs/common'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { TopicInteraction } from '../../schema/topic_interaction.schema'
import { TopicInteractionRepositoryInterface } from '../topic_interaction.interface.repository'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

@Injectable()
export class TopicInteractionRepository
    extends BaseRepositoryAbstract<TopicInteraction>
    implements TopicInteractionRepositoryInterface
{
    constructor(
        @InjectModel(TopicInteraction.name)
        private readonly interactionModel: Model<TopicInteraction>
    ) {
        super(interactionModel)
    }

    async findRecentView(userId: string, topicId: string, minutes: number): Promise<TopicInteraction | null> {
        return this.findOneByCondition({
            userId,
            topicId,
            action: 'view',
            createdAt: {
                $gte: new Date(Date.now() - minutes * 60 * 1000)
            }
        })
    }

    async getInteractionsByTopic(topicId: string): Promise<TopicInteraction[]> {
        return this.interactionModel
            .find({ topicId: new Types.ObjectId(topicId) })
            .sort({ createdAt: -1 })
            .exec()
    }

    async getAggregatedInteractions(
        topicIds: Types.ObjectId[]
    ): Promise<{ topicId: string; interactionCount: number; weightedScore: number }[]> {
        if (topicIds.length === 0) return []

        const pipeline = [
            { $match: { topicId: { $in: topicIds } } },
            {
                $group: {
                    _id: '$topicId',
                    viewCount: { $sum: { $cond: [{ $eq: ['$action', 'view'] }, 1, 0] } },
                    clickCount: { $sum: { $cond: [{ $eq: ['$action', 'click'] }, 1, 0] } },
                    bookmarkCount: { $sum: { $cond: [{ $eq: ['$action', 'bookmark'] }, 1, 0] } },
                    registerCount: { $sum: { $cond: [{ $eq: ['$action', 'register'] }, 1, 0] } },
                    totalCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    topicId: { $toString: '$_id' },
                    interactionCount: '$totalCount',
                    weightedScore: {
                        $add: [
                            { $multiply: ['$viewCount', 1] }, // View: 1 point
                            { $multiply: ['$clickCount', 2] }, // Click: 2 points
                            { $multiply: ['$bookmarkCount', 3] }, // Bookmark: 3 points
                            { $multiply: ['$registerCount', 5] } // Register: 5 points
                        ]
                    }
                }
            }
        ]

        const results = await this.interactionModel.aggregate(pipeline).exec()
        return results as { topicId: string; interactionCount: number; weightedScore: number }[]
    }
}
