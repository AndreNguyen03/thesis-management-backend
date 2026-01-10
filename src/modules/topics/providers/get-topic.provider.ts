import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { TopicRepositoryInterface } from '../repository'
import {
    CurrentTopicsState,
    GetGeneralTopics,
    PaginatedTopicsInLibrary,
    PaginatedTopicsInPeriod,
    RequestGetTopicsInAdvanceSearchParams,
    RequestGetTopicsInPhaseParams,
    RequestLectureGetTopicsInPhaseParams,
    StandardStructureTopicDto,
    TopicsInLibrary
} from '../dtos'
import { plainToInstance } from 'class-transformer'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { Topic } from '../schemas/topic.schemas'
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

    async getStandarStructureTopicsByTopicIds(topicIds: string[], limit: number): Promise<StandardStructureTopicDto[]> {
        const result = await this.topicRepositoryInterface.getStandarStructureTopicsByTopicIds(topicIds, limit)
        return plainToInstance(StandardStructureTopicDto, result, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    async getCurrentTopicsState(topicIds: string[], limit: number): Promise<CurrentTopicsState[]> {
        const result = await this.topicRepositoryInterface.getCurrentTopicsState(topicIds, limit)
        return plainToInstance(CurrentTopicsState, result, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    async getTopicsInPhase(periodId: string, query: RequestGetTopicsInPhaseParams): Promise<PaginatedTopicsInPeriod> {
        const periodInfo = await this.periodsService.getPeriodById(periodId)
        const paginationResult = await this.topicRepositoryInterface.getTopicsInPhaseHistory(periodId, query)
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
    async getTopicsInLibrary(query: RequestGetTopicsInAdvanceSearchParams): Promise<PaginatedTopicsInLibrary> {
        const result = await this.topicRepositoryInterface.getTopicsInLibrary(query)
        return {
            data: plainToInstance(TopicsInLibrary, result.data, {
                excludeExtraneousValues: true,
                enableImplicitConversion: true
            }),
            meta: {
                ...result.meta
            }
        }
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
