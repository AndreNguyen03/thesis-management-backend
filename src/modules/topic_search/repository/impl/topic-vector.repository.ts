import mongoose, { Model, Types } from 'mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { RequestGetTopicsInAdvanceSearchParams, RequestGetTopicsInPhaseParams } from '../../../topics/dtos'
import { TopicVector } from '../../schemas/topic-vector.schemas'
import { TopicVectorRepositoryInterface } from '../topic-vector.repository.interface'
import { PeriodPhaseName } from '../../../periods/enums/period-phases.enum'
import { TopicStatus } from '../../../topics/enum'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { CandidateTopicDto } from '../../../topics/dtos/candidate-topic.dto'

@Injectable()
export class TopicVectorRepository
    extends BaseRepositoryAbstract<TopicVector>
    implements TopicVectorRepositoryInterface
{
    constructor(
        @InjectModel(TopicVector.name)
        private readonly topicVectorModel: Model<TopicVector>,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(topicVectorModel)
    }

    async semanticSearchRegisteringTopics(
        queryVector: number[],
        query: RequestGetTopicsInAdvanceSearchParams,
        periodId?: string
    ): Promise<Paginated<TopicVector>> {
        const pipelineSub: any[] = []
        if (queryVector.length > 0) {
            pipelineSub.push(
                {
                    $vectorSearch: {
                        index: 'search_topic_vector_index',
                        path: 'embedding',
                        queryVector: queryVector,
                        // exact: true,
                        numCandidates: 100,
                        limit: 50,
                        filter: {
                            'periodInfo._id': periodId,
                            currentPhase: PeriodPhaseName.OPEN_REGISTRATION,
                            currentStatus: {
                                $in: [TopicStatus.PendingRegistration, TopicStatus.Registered, TopicStatus.Full]
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        score: { $meta: 'vectorSearchScore' }
                    }
                },
                {
                    $match: {
                        score: { $gt: 0.7 }
                    }
                }
            )
        }

        if (query.lecturerIds) {
            pipelineSub.push({
                $match: {
                    ...{
                        ...(query.lecturerIds
                            ? {
                                  lecturerIds: {
                                      $in: query.lecturerIds.map((id) => new mongoose.Types.ObjectId(id))
                                  }
                              }
                            : {})
                    },
                    ...{
                        ...(query.fieldIds
                            ? {
                                  fieldIds: {
                                      $in: query.fieldIds.map((id) => new mongoose.Types.ObjectId(id))
                                  }
                              }
                            : {})
                    },
                    ...{
                        ...(query.queryStatus
                            ? {
                                  currentStatus: {
                                      $in: query.queryStatus
                                  }
                              }
                            : {})
                    }
                }
            })
        }

        return await this.paginationProvider.paginateQuery<TopicVector>(query, this.topicVectorModel, pipelineSub)
    }

    async semanticSearchTopicsInLibrary(
        queryVector: number[],
        query: RequestGetTopicsInAdvanceSearchParams
    ): Promise<Paginated<TopicVector>> {
        const pipelineSub: any[] = []
        if (queryVector.length > 0) {
            pipelineSub.push(
                {
                    $vectorSearch: {
                        index: 'search_topic_vector_index',
                        path: 'embedding',
                        queryVector: queryVector,
                        // exact: true,
                        numCandidates: 100,
                        limit: 50,
                        filter: {
                            'lastStatusInPhaseHistory.phaseName': PeriodPhaseName.COMPLETION,
                            'lastStatusInPhaseHistory.status': TopicStatus.Archived
                        }
                    }
                },
                {
                    $addFields: {
                        score: {
                            $round: [{ $meta: 'vectorSearchScore' }, 2]
                        }
                    }
                },
                {
                    $match: {
                        score: { $gt: 0.7 }
                    }
                }
            )
        }

        if (query.lecturerIds) {
            pipelineSub.push({
                $match: {
                    ...{
                        ...(query.lecturerIds
                            ? {
                                  lecturerIds: {
                                      $in: query.lecturerIds.map((id) => new mongoose.Types.ObjectId(id))
                                  }
                              }
                            : {})
                    },
                    ...{
                        ...(query.fieldIds
                            ? {
                                  fieldIds: {
                                      $in: query.fieldIds.map((id) => new mongoose.Types.ObjectId(id))
                                  }
                              }
                            : {})
                    },
                    ...{
                        ...(query.queryStatus
                            ? {
                                  currentStatus: {
                                      $in: query.queryStatus
                                  }
                              }
                            : {})
                    }
                }
            })
        }
        pipelineSub.push({
            $project: {
                embedding: 0,
                text_content: 0,
                lastStatusInPhaseHistory: 0,
                _id: 0
            }
        })

        return await this.paginationProvider.paginateQuery<TopicVector>(query, this.topicVectorModel, pipelineSub)
    }
    //  $project: {
    //                 _id: 1,
    //                 titleVN: 1,
    //                 titleEng: 1,
    //                 description: 1,
    //                 type: 1,
    //                 majorId: 1,
    //                 maxStudents: 1,
    //                 currentStatus: 1,
    //                 currentPhase: 1,
    //                 allowManualApproval: 1,
    //                 // Merge lecturer interests
    //                 areaInterest: '$lecturer.areaInterest',
    //                 researchInterests: '$lecturer.researchInterests',
    //                 // Populated arrays
    //                 fields: 1,
    //                 requirements: 1,
    //                 // Timestamps
    //                 createdAt: 1,
    //                 updatedAt: 1
    //                 // Exclude: creator, lecturer (full docs), referenceDocs, finalProduct, etc., if not needed
    //             }

    async getPendingRegistrationTopics(periodId: string): Promise<CandidateTopicDto[]> {
        const pipeline = [
            {
                $match: {
                    'periodInfo._id': periodId,
                    deleted_at: null
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'createByInfo._id',
                    foreignField: '_id',
                    as: 'creator'
                }
            },
            {
                $unwind: {
                    path: '$creator',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    titleVN: 1,
                    titleEng: 1,
                    description: 1,
                    type: 1,
                    majorId: '$major._id',
                    maxStudents: 1,
                    currentStatus: 1,
                    currentPhase: 1,
                    allowManualApproval: 1,
                    areaInterest: '$creator.areaInterest',
                    researchInterests: '$creator.researchInterests',
                    createByInfo: 1,
                    embedding: 1,
                    fields: 1,
                    requirements: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]

        const result = await this.topicVectorModel.aggregate(pipeline)
        return result
    }
}
