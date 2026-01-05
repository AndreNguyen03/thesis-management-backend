import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { TopicRepositoryInterface } from '../repository'
import {
    GetGeneralTopics,
    PaginatedGeneralTopics,
    PaginatedTopicsInPeriod,
    RequestGetTopicsInAdvanceSearchParams,
    RequestGetTopicsInPhaseParams,
    RequestLectureGetTopicsInPhaseParams
} from '../dtos'
import { plainToInstance } from 'class-transformer'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { Topic } from '../schemas/topic.schemas'
import { GetRegistrationInTopicProvider } from '../../registrations/provider/get-registration-in-topic.provider'
import { PeriodsService } from '../../periods/application/periods.service'
import { BaseServiceAbstract } from '../../../shared/base/service/base.service.abstract'
import { OverdueTopicInfo, PausedOrDelayedTopicInfo, PendingLecturerReview } from '../../periods/dtos/phase-resolve.dto'

@Injectable()
export class GetTopicProvider extends BaseServiceAbstract<Topic> {
    // Add methods and logic as needed
    constructor(
        @Inject('TopicRepositoryInterface') private readonly topicRepositoryInterface: TopicRepositoryInterface,
        @Inject(forwardRef(() => PeriodsService))
        private readonly periodsService: PeriodsService
    ) {
        super(topicRepositoryInterface)
    }
    async getTopicsInPhase(periodId: string, query: RequestGetTopicsInPhaseParams): Promise<PaginatedTopicsInPeriod> {
        const periodInfo = await this.periodsService.getPeriodById(periodId)
        const paginationResult = await this.topicRepositoryInterface.getTopicsInPhaseHistory(periodId, query)
        console.log('paginationResult', paginationResult)
        return {
            data: plainToInstance(GetGeneralTopics, paginationResult.data, {
                excludeExtraneousValues: true,
                enableImplicitConversion: true
            }),
            meta: {
                ...paginationResult.meta,
                periodInfo: periodInfo
            }
        }
    }
    async getTopicsInLibrary(query: RequestGetTopicsInAdvanceSearchParams): Promise<Paginated<Topic>> {
        return await this.topicRepositoryInterface.getTopicsInLibrary(query)
    }
    async lecturerGetTopicsInPhase(
        userId: string,
        periodId: string,
        query: RequestLectureGetTopicsInPhaseParams
    ): Promise<PaginatedTopicsInPeriod> {
        //lấy phase hiện tại của period
        const currentPhase = await this.periodsService.getPeriodById(periodId)
        query.phase = currentPhase.currentPhase
        const paginationResult = await this.topicRepositoryInterface.getTopicsInPhaseHistory(periodId, query, userId)
        return {
            data: plainToInstance(GetGeneralTopics, paginationResult.data, {
                excludeExtraneousValues: true,
                enableImplicitConversion: true
            }),
            meta: {
                ...paginationResult.meta,
                periodInfo: currentPhase
            }
        }
    }
    async getRegisteringTopics(
        periodId: string,
        query: RequestGetTopicsInAdvanceSearchParams
    ): Promise<Paginated<Topic>> {
        return await this.topicRepositoryInterface.getRegisteringTopics(periodId, query)
    }
    async getLecturerSubmittedTopicNum(lecturerId: string): Promise<number> {
        return this.topicRepositoryInterface.getSubmittedTopicsNumber(lecturerId)
    }
    async getOverDueTopics(periodId: string): Promise<OverdueTopicInfo[]> {
        return await this.topicRepositoryInterface.getOverDueTopics(periodId)
    }
    async getPendingReviewTopics(periodId: string): Promise<PendingLecturerReview[]> {
        return await this.topicRepositoryInterface.getPendingReviewTopics(periodId)
    }
    async getPausedOrDelayedTopics(periodId: string): Promise<PausedOrDelayedTopicInfo[]> {
        return await this.topicRepositoryInterface.getPausedOrDelayedTopics(periodId)
    }
}
