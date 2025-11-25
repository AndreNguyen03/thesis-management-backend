import { Inject, Injectable } from '@nestjs/common'
import { TopicRepositoryInterface } from '../repository'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'
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

@Injectable()
export class GetStatisticsTopicsProvider {
    constructor(
        @Inject('TopicRepositoryInterface')
        private readonly topicRepositoryInterface: TopicRepositoryInterface
    ) {}
    async boardGetTopicsStatistic(periodId: string, phaseName: PeriodPhaseName) {
        if (phaseName === PeriodPhaseName.SUBMIT_TOPIC) {
            return await this.getStatisticInSubmitPhase(periodId)
        } else if (phaseName === PeriodPhaseName.OPEN_REGISTRATION) {
            return await this.getStatisticsOpenRegistrationPhase(periodId)
        } else {
            if (phaseName === PeriodPhaseName.EXECUTION) {
                return await this.getStatisticsExecutionPhase(periodId)
            } else {
                return await this.getStatisticsCompletionPhase(periodId)
            }
        }
    }
    async lecturerGetTopicsStatistic(periodId: string, lecturerId: string, phaseName: PeriodPhaseName) {
        if (phaseName === PeriodPhaseName.SUBMIT_TOPIC) {
            return await this.lecturerGetStatisticTopicsInSubmitPhase(periodId, lecturerId)
        } else if (phaseName === PeriodPhaseName.OPEN_REGISTRATION) {
            return await this.lecturerGetStatisticsOpenRegistrationPhase(periodId, lecturerId)
        } else {
            if (phaseName === PeriodPhaseName.EXECUTION) {
                return await this.lecturerGetStatisticsExecutionPhase(periodId, lecturerId)
            } else {
                return await this.lecturerGetStatisticsCompletionPhase(periodId, lecturerId)
            }
        }
    }
    async getStatisticInSubmitPhase(periodId: string): Promise<GetTopicStatisticInSubmitPhaseDto> {
        return await this.topicRepositoryInterface.getStatisticInSubmitPhase(periodId)
    }
    async getStatisticsOpenRegistrationPhase(periodId: string): Promise<GetTopicStatisticInOpenRegPhaseDto> {
        return await this.topicRepositoryInterface.getStatisticsOpenRegistrationPhase(periodId)
    }
    async getStatisticsExecutionPhase(periodId: string): Promise<GetTopicsStatisticInExecutionPhaseDto> {
        return await this.topicRepositoryInterface.getStatisticsExecutionPhase(periodId)
    }
    async getStatisticsCompletionPhase(periodId: string): Promise<GetTopicsStatisticInCompletionPhaseDto> {
        return await this.topicRepositoryInterface.getStatisticsCompletionPhase(periodId)
    }
    //lectuer get function
    async lecturerGetStatisticTopicsInSubmitPhase(
        periodId: string,
        lecturerId: string
    ): Promise<LecGetTopicStatisticInSubmitPhaseDto> {
        return await this.topicRepositoryInterface.lecturerGetStatisticTopicsInSubmitPhase(periodId,lecturerId)
    }
    async lecturerGetStatisticsOpenRegistrationPhase(
        periodId: string,
        lecturerId: string
    ): Promise<LecGetTopicStatisticInOpenRegPhaseDto> {
        return await this.topicRepositoryInterface.lecturerGetStatisticsOpenRegistrationPhase(periodId,lecturerId)
    }
    async lecturerGetStatisticsExecutionPhase(
        periodId: string,
        lecturerId: string
    ): Promise<LecGetTopicsStatisticInExecutionPhaseDto> {
        return await this.topicRepositoryInterface.lecturerGetStatisticsExecutionPhase(periodId,lecturerId)
    }
    async lecturerGetStatisticsCompletionPhase(
        periodId: string,
        lecturerId: string
    ): Promise<LecGetTopicsStatisticInCompletionPhaseDto> {
        return await this.topicRepositoryInterface.lecturerGetStatisticsCompletionPhase(periodId,lecturerId)
    }
}
