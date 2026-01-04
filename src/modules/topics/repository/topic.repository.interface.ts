import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { GetMiniMiniMajorDto } from '../../majors/dtos/get-major.dto'
import { OverdueTopicInfo, PausedOrDelayedTopicInfo, PendingLecturerReview } from '../../periods/dtos/phase-resolve.dto'
import { GetUploadedFileDto } from '../../upload-files/dtos/upload-file.dtos'
import {
    CreateTopicDto,
    GetCancelRegisteredTopicResponseDto,
    GetMiniTopicInfo,
    GetTopicDetailResponseDto,
    GetTopicResponseDto,
    PaginationTopicsQueryParams,
    PatchTopicDto,
    PublishTopic,
    RequestGetTopicsInAdvanceSearchParams,
    RequestGetTopicsInPeriodDto,
    RequestGetTopicsInPhaseParams
} from '../dtos'
import { CandidateTopicDto } from '../dtos/candidate-topic.dto'
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
import { SubmittedTopicParamsDto } from '../dtos/query-params.dtos'
import { RequestGradeTopicDto } from '../dtos/request-grade-topic.dtos'
import { Topic } from '../schemas/topic.schemas'

export interface TopicRepositoryInterface extends BaseRepositoryInterface<Topic> {
    createTopic(topicData: CreateTopicDto): Promise<string>
    getTopicById(topicId: string, userId: string, role: string): Promise<GetTopicDetailResponseDto | null>
    getAllTopics(userId: string): Promise<Paginated<Topic>>
    deleteTopics(topicIds: string[], ownerId: string): Promise<boolean>
    updateTopic(id: string, topicData: PatchTopicDto): Promise<Topic | null>
    findByTitle(titleVN: string, titleEng: string, periodId: string): Promise<Topic | null>
    findSavedTopicsByUserId(userId: string, query: PaginationQueryDto): Promise<Paginated<Topic>>
    findRegisteredTopicsByUserId(userId: string, query: PaginationQueryDto): Promise<Paginated<Topic>>
    findCanceledRegisteredTopicsByUserId(
        userId: string,
        userRole: string
    ): Promise<GetCancelRegisteredTopicResponseDto[]>
    // getTopicsInPeriod(periodId: string, query: RequestGetTopicsInPeriodDto): Promise<Paginated<Topic>>
    getTopicsInPhaseHistory(
        periodId: string,
        query: RequestGetTopicsInPhaseParams,
        ownerId?: string
    ): Promise<Paginated<Topic>>
    getTopicsInLibrary(query: RequestGetTopicsInAdvanceSearchParams): Promise<Paginated<Topic>>
    getRegisteringTopics(periodId: string, query: RequestGetTopicsInAdvanceSearchParams): Promise<Paginated<Topic>>
    getCurrentStatusTopic(topicId: string): Promise<string>
    addTopicGrade(topicId: string, actorId: string, body: RequestGradeTopicDto): Promise<number>
    //faculty board get statistics
    getStatisticInSubmitPhase(periodId: string): Promise<GetTopicStatisticInSubmitPhaseDto>
    getStatisticsExecutionPhase(periodId: string): Promise<GetTopicsStatisticInExecutionPhaseDto>
    getStatisticsOpenRegistrationPhase(periodId: string): Promise<GetTopicStatisticInOpenRegPhaseDto>
    getStatisticsCompletionPhase(periodId: string): Promise<GetTopicsStatisticInCompletionPhaseDto>
    //lecturer get statistics
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
    //file
    storedFilesIn4ToTopic(topicId: string, fileIds: string[]): Promise<GetUploadedFileDto[]>
    deleteManyFilesFromTopic(topicId: string, fileIds?: string[]): Promise<boolean>
    deleteFileFromTopic(topicId: string, fileId: string): Promise<boolean>
    findDraftTopicsByLecturerId(lecturerId: string, query: PaginationQueryDto): Promise<Paginated<Topic>>
    findSubmittedTopicsByLecturerId(lecturerId: string, query: SubmittedTopicParamsDto): Promise<Paginated<Topic>>
    getSubmittedTopicsNumber(lecturerId: string): Promise<number>
    getMiniTopicInfo(topicId: string): Promise<GetMiniTopicInfo>
    copyToDraft(topicId: string, actorId: string): Promise<string>
    getMajorsOfTopicInLibrary()
    getYearsOfTopicInLibrary(): Promise<string[]>
    //: Promise<GetMiniMiniMajorDto[]>
    getDocumentsOfTopic(topicId: string): Promise<GetUploadedFileDto[]>
    findTopicsByStatusInPeriod(status: string, periodId: string, query: PaginationQueryDto): Promise<Paginated<Topic>>
    //get TOpic
    getOverDueTopics(periodId: string): Promise<OverdueTopicInfo[]>
    getPendingReviewTopics(periodId: string): Promise<PendingLecturerReview[]>
    getPausedOrDelayedTopics(periodId: string): Promise<PausedOrDelayedTopicInfo[]>

    getCandidateTopics(): Promise<CandidateTopicDto[]>
    getFacultyTopicsWithPopularity(facultyId: string): Promise<any[]>
    updateTopicsToCompletion(topicIds: string[]): Promise<number>
    getDetailTopicsInDefenseMilestones(
        templateMilestoneId: string,
        query?: PaginationQueryDto
    ): Promise<Paginated<Topic>>
    batchPublishOrNotDefenseResults(topics: PublishTopic[]): Promise<boolean>
}
