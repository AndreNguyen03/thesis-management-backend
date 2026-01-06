import { BadGatewayException, forwardRef, Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { TopicVector } from '../../topic_search/schemas/topic-vector.schemas'
import { TopicStatus } from '../../topics/enum'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'
import { TopicVectorSearch } from '../../recommend/dto/recommendation-response.dto'

@Injectable()
export class SearchSimilarTopicsProvider {
    constructor(@InjectModel(TopicVector.name) private readonly topicVectorModel: Model<TopicVector>) {}
    async searchSimilarTopics(queryVector: number[], periodId: string): Promise<TopicVectorSearch[]> {
        const agg = [
            {
                $vectorSearch: {
                    index: 'topic_vector_recommend_index',
                    path: 'embedding',
                    queryVector: queryVector,
                    numCandidates: 200,
                    limit: 20,
                    skip: 0,
                    filter: {
                        'periodInfo._id': periodId,
                        currentStatus: {
                            $in: [TopicStatus.PendingRegistration, TopicStatus.Registered]
                        },
                        currentPhase: PeriodPhaseName.OPEN_REGISTRATION
                    }
                }
            },

            {
                $project: {
                    _id: 1,
                    titleVN: 1,
                    currentStatus: 1,
                    studentsNum: 1,
                    maxStudents: 1,
                    score: {
                        $meta: 'vectorSearchScore'
                    },
                    major: 1,
                    fields: 1,
                    requirements: 1,
                    lecturers: 1,
                    createByInfo: 1
                }
            },
            {
                $match: {
                    score: { $gte: 0.6 } // it lien quan thi loc ra
                }
            }
        ]
        // run pipeline
        const result = await this.topicVectorModel.aggregate(agg)
        console.log('Search similar documents result:', result.length)
        return result
    }
}
