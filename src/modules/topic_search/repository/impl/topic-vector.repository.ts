import mongoose, { Model } from 'mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { RequestGetTopicsInPhaseDto } from '../../../topics/dtos'
import { TopicVector } from '../../schemas/topic-vector.schemas'
import { TopicVectorRepositoryInterface } from '../topic-vector.repository.interface'
import { PeriodPhaseName } from '../../../periods/enums/period-phases.enum'
import { TopicStatus } from '../../../topics/enum'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'

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
    async semanticSearchTopicVectors(
        queryVector: number[],
        periodId: string,
        query: RequestGetTopicsInPhaseDto,
        phaseName: string,
        status: string
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
                            'lastStatusInPhaseHistory.phaseName': phaseName,
                            'lastStatusInPhaseHistory.status': status
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
}
