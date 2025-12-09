import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { RequestGetTopicsInPhaseDto } from '../../topics/dtos'
import { TopicVector } from '../schemas/topic-vector.schemas'

export interface TopicVectorRepositoryInterface extends BaseRepositoryInterface<TopicVector> {
    semanticSearchTopicVectors(
        queryVector: number[],
        periodId: string,
        query: RequestGetTopicsInPhaseDto,
        phaseName: string,
        status: string
    ): Promise<Paginated<TopicVector>>
}
