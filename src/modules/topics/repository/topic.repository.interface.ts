import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { CreateTopicDto, GetTopicResponseDto } from '../dtos'
import { Topic } from '../schemas/topic.schemas'

export interface TopicRepositoryInterface extends BaseRepositoryInterface<Topic> {
    createTopic(topicData: CreateTopicDto): Promise<GetTopicResponseDto>
    getAllTopics(): Promise<GetTopicResponseDto[]>
    findSavedByUser(userId: string, role: string): Promise<GetTopicResponseDto[]>
    findByTitle(title: string): Promise<Topic | null>
}
