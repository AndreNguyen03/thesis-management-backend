import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { RefFieldTopics } from '../schemas/ref_fields_topics.schemas'

export interface IRefFieldsTopicsRepository extends BaseRepositoryInterface<RefFieldTopics> {
    createWithFieldIds(topicId: string, fieldIds: string[]): Promise<RefFieldTopics[]>
    deleteManyByTopicId(topicId: string): Promise<any>
    deleteManyByFieldIdsAndTopicId(topicId: string, fieldIds: string[]): Promise<any>
}
