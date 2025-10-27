import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { CreateTopicDto, GetCancelRegisteredTopicResponseDto, GetTopicDetailResponseDto, GetTopicResponseDto } from '../dtos'
import { Topic } from '../schemas/topic.schemas'

export interface TopicRepositoryInterface extends BaseRepositoryInterface<Topic> {
    createTopic(topicData: CreateTopicDto): Promise<GetTopicResponseDto>
    getTopicById(topicId: string, userId: string, role: string): Promise<GetTopicDetailResponseDto | null>
    getAllTopics(userId: string): Promise<GetTopicResponseDto[]>
    findByTitle(title: string): Promise<Topic | null>
    findSavedTopicsByUserId(userId: string): Promise<GetTopicResponseDto[]>
    findRegisteredTopicsByUserId(userId: string): Promise<GetTopicResponseDto[]>
    findCanceledRegisteredTopicsByUserId(
        userId: string,
        userRole: string
    ): Promise<GetCancelRegisteredTopicResponseDto[]>
}
