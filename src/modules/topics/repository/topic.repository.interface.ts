import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { GetTopicResponseDto } from '../dtos'
import { Topic } from '../schemas/topic.schemas'

export interface TopicRepositoryInterface extends BaseRepositoryInterface<Topic> {
    getAllTopics(userId: string, role: string): Promise<any>
    findSavedByUser(userId: string, role: string): Promise<GetTopicResponseDto[]>
}
