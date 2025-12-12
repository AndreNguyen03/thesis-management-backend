import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { RequestGetTopicsInAdvanceSearchParams, RequestGetTopicsInPhaseParams } from '../../topics/dtos'
import { TopicVector } from '../schemas/topic-vector.schemas'

export interface TopicVectorRepositoryInterface extends BaseRepositoryInterface<TopicVector> {
    semanticSearchRegisteringTopics(
        queryVector: number[],
        query: RequestGetTopicsInAdvanceSearchParams,
        periodId?: string
    ): Promise<Paginated<TopicVector>>

    semanticSearchTopicsInLibrary(
        queryVector: number[],
        query: RequestGetTopicsInAdvanceSearchParams,
    ): Promise<Paginated<TopicVector>>
}
