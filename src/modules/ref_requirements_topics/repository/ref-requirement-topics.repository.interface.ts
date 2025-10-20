import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { RefRequirementTopics } from '../schemas/ref_requirement_topics.schemas'

export interface IRefRequirementTopicsRepository extends BaseRepositoryInterface<RefRequirementTopics> {
    createWithRequirmentIds(topicId: string, requirementIds: string[]): Promise<RefRequirementTopics[]>
    deleteManyByTopicId(topicId: string): Promise<any>
    deleteManyByRequirementIdsAndTopicId(topicId: string, requirementIds: string[]): Promise<any>
}
