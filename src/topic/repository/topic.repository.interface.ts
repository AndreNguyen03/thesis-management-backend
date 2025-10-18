import { BaseRepositoryInterface } from '../../shared/base/repository/base.repository.interface'
import { GetTopicResponseDto } from '../dtos'
import { Topic } from '../schemas/topic.schemas'

export interface TopicRepositoryInterface extends BaseRepositoryInterface<Topic> {
    getAllTheses(userId: string, role: string): Promise<GetTopicResponseDto[]>
    findSavedByUser(userId: string, role: string): Promise<GetTopicResponseDto[]>
    saveTopic(userId: string, role: string, topicId: string)
}
