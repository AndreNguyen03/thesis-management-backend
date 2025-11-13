import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import {
    CreateTopicDto,
    GetCancelRegisteredTopicResponseDto,
    GetTopicDetailResponseDto,
    GetTopicResponseDto,
    RequestGetTopicsInPeriodDto,
    RequestGetTopicsInPhaseDto
} from '../dtos'
import { RequestGradeTopicDto } from '../dtos/request-grade-topic.dtos'
import { Topic } from '../schemas/topic.schemas'

export interface TopicRepositoryInterface extends BaseRepositoryInterface<Topic> {
    createTopic(topicData: CreateTopicDto):Promise<string>
    getTopicById(topicId: string, userId: string, role: string): Promise<GetTopicDetailResponseDto | null>
    getAllTopics(userId: string): Promise<GetTopicResponseDto[]>
    findByTitle(title: string): Promise<Topic | null>
    findSavedTopicsByUserId(userId: string): Promise<GetTopicResponseDto[]>
    findRegisteredTopicsByUserId(userId: string): Promise<GetTopicResponseDto[]>
    findCanceledRegisteredTopicsByUserId(
        userId: string,
        userRole: string
    ): Promise<GetCancelRegisteredTopicResponseDto[]>
    getTopicsInPeriod(periodId: string, query: RequestGetTopicsInPeriodDto): Promise<Paginated<Topic>>
    getTopicsInPhase(phaseId: string, query: RequestGetTopicsInPhaseDto): Promise<Paginated<Topic>>
    getCurrentStatusTopic(topicId: string): Promise<string>
    addTopicGrade(topicId: string, actorId: string, body: RequestGradeTopicDto): Promise<number>
}
