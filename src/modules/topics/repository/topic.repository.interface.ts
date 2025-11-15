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
import {
    GetTopicsStatisticInCompletionPhaseDto,
    GetTopicsStatisticInExecutionPhaseDto,
    GetTopicStatisticInOpenRegPhaseDto,
    GetTopicStatisticInSubmitPhaseDto,
    LecGetTopicsStatisticInCompletionPhaseDto,
    LecGetTopicsStatisticInExecutionPhaseDto,
    LecGetTopicStatisticInOpenRegPhaseDto,
    LecGetTopicStatisticInSubmitPhaseDto
} from '../dtos/get-statistics-topics.dtos'
import { RequestGradeTopicDto } from '../dtos/request-grade-topic.dtos'
import { Topic } from '../schemas/topic.schemas'

export interface TopicRepositoryInterface extends BaseRepositoryInterface<Topic> {
    createTopic(topicData: CreateTopicDto): Promise<string>
    getTopicById(topicId: string, userId: string, role: string): Promise<GetTopicDetailResponseDto | null>
    getAllTopics(userId: string): Promise<Paginated<Topic>>
    deleteTopic(topicId: string, ownerId: string): Promise<boolean>
    findByTitle(titleVN: string, titleEng: string, periodId: string): Promise<Topic | null>
    findSavedTopicsByUserId(userId: string): Promise<Paginated<Topic>>
    findRegisteredTopicsByUserId(userId: string): Promise<GetTopicResponseDto[]>
    findCanceledRegisteredTopicsByUserId(
        userId: string,
        userRole: string
    ): Promise<GetCancelRegisteredTopicResponseDto[]>
    getTopicsInPeriod(periodId: string, query: RequestGetTopicsInPeriodDto): Promise<Paginated<Topic>>
    getTopicsInPhase(phaseId: string, query: RequestGetTopicsInPhaseDto): Promise<Paginated<Topic>>
    getCurrentStatusTopic(topicId: string): Promise<string>
    addTopicGrade(topicId: string, actorId: string, body: RequestGradeTopicDto): Promise<number>
    getStatisticTopicsInSubmitPhase(periodId: string): Promise<GetTopicStatisticInSubmitPhaseDto>
    getStatisticsOpenRegistrationPhase(periodId: string): Promise<GetTopicStatisticInOpenRegPhaseDto>
    getStatisticsExecutionPhase(periodId: string): Promise<GetTopicsStatisticInExecutionPhaseDto>
    getStatisticsCompletionPhase(periodId: string): Promise<GetTopicsStatisticInCompletionPhaseDto>
    getStatisticTopicsInSubmitPhase(periodId: string): Promise<GetTopicStatisticInSubmitPhaseDto>
    getStatisticsOpenRegistrationPhase(periodId: string): Promise<GetTopicStatisticInOpenRegPhaseDto>
    getStatisticsExecutionPhase(periodId: string): Promise<GetTopicsStatisticInExecutionPhaseDto>
    getStatisticsCompletionPhase(periodId: string): Promise<GetTopicsStatisticInCompletionPhaseDto>
    lecturerGetStatisticTopicsInSubmitPhase(
        periodId: string,
        lecturerId: string
    ): Promise<LecGetTopicStatisticInSubmitPhaseDto>
    lecturerGetStatisticsOpenRegistrationPhase(
        periodId: string,
        lecturerId: string
    ): Promise<LecGetTopicStatisticInOpenRegPhaseDto>
    lecturerGetStatisticsExecutionPhase(
        periodId: string,
        lecturerId: string
    ): Promise<LecGetTopicsStatisticInExecutionPhaseDto>
    lecturerGetStatisticsCompletionPhase(
        periodId: string,
        lecturerId: string
    ): Promise<LecGetTopicsStatisticInCompletionPhaseDto>
    addFieldToTopicQuick(topicId: string, fieldId: string, userId: string): Promise<Topic | null>
    removeFieldFromTopicQuick(topicId: string, fieldId: string, userId: string): Promise<Topic | null>
    addRequirementToTopicQuick(topicId: string, fieldId: string, userId: string): Promise<Topic | null>
    removeRequirementFromTopicQuick(topicId: string, requirementId: string, userId: string): Promise<Topic | null>

    // addFieldIds(topicId: string, fieldIds: string[]): Promise<string[]>
    // deleteAllByTopicId(topicId: string): Promise<any>
    // deleteManyByFieldIdsAndTopicId(topicId: string, fieldIds: string[]): Promise<any>
}
