import { Inject, Injectable, RequestTimeoutException } from '@nestjs/common'
import { IPeriodRepository } from '../repository/periods.repository.interface'
import { CreatePeriodDto, UpdatePeriodDto } from '../dtos/period.dtos'
import { BaseServiceAbstract } from '../../../shared/base/service/base.service.abstract'
import { Period } from '../schemas/period.schemas'
import { CreatePhaseProvider } from '../providers/create-phase.provider'
import { RequestGetPeriodsDto } from '../dtos/request-get-all.dto'
import { plainToClass } from 'class-transformer'
import { PeriodStatus } from '../enums/periods.enum'
import {
    CreateCompletionPhaseDto,
    CreateExecutionPhaseDto,
    CreateOpenRegPhaseDto,
    CreatePhaseSubmitTopicDto,
    UpdatePeriodPhaseDto
} from '../dtos/period-phases.dtos'
import { PeriodPhaseNotFoundException } from '../../../common/exceptions/period-exceptions'
import { GetTopicProvider } from '../../topics/providers/get-topic.provider'
import { RequestGetTopicsInPhaseDto } from '../../topics/dtos'
import { GetTopicStatusProvider } from '../../topics/providers/get-status-topic.provider'
import { GetPhaseProvider } from '../providers/get-phase.provider'
import { GetStatisticsTopicsProvider } from '../../topics/providers/get-statistics-topics.provider'

import { PeriodPhaseName } from '../enums/period-phases.enum'
import { GetCustomRequestDto } from '../dtos/custom-request.dtos'

@Injectable()
export class PeriodsService extends BaseServiceAbstract<Period> {
    constructor(
        @Inject('IPeriodRepository') private readonly iPeriodRepository: IPeriodRepository,
        private readonly createPhaseProvider: CreatePhaseProvider,
        private readonly getTopicProvider: GetTopicProvider,
        private readonly getTopicStatusProvider: GetTopicStatusProvider,
        private readonly getPhaseProvider: GetPhaseProvider,
        private readonly getStatisticsTopicsProvider: GetStatisticsTopicsProvider
    ) {
        super(iPeriodRepository)
    }
    async createNewPeriod(actorId: string, facultyId: string, createPeriodDto: CreatePeriodDto) {
        const { phaseSubmitTopic, ...nest } = createPeriodDto
        const periodData = {
            ...nest,
            facultyId: facultyId
        }
        const newPeriod = await this.create(periodData)
        if (phaseSubmitTopic) {
            await this.createPhaseSubmitTopic(actorId, newPeriod._id.toString(), phaseSubmitTopic)
        }
    }
    async getAllPeriods(facultyId: string, query: RequestGetPeriodsDto) {
        return this.iPeriodRepository.getAllPeriods(facultyId, query)
    }

    async deletePeriod(id: string) {
        return this.iPeriodRepository.deletePeriod(id)
    }

    // update period info
    async adjustPeriod(periodId: string, periodDto: UpdatePeriodDto) {
        try {
            return this.update(periodId, periodDto)
        } catch (error) {
            throw new RequestTimeoutException()
        }
    }

    // set period completed
    async setPeriodCompleted(periodId: string) {
        const period = await this.findOneById(periodId)
        const updatedPeriod = plainToClass(Period, {
            ...period,
            status: PeriodStatus.Completed
        })
        return this.iPeriodRepository.update(periodId, updatedPeriod)
    }

    async getPeriodInfo(periodId: string) {
        const period = await this.findOneById(periodId)
        return period
    }

    async createPhaseSubmitTopic(
        actorId: string,
        periodId: string,
        createPhaseSubmitTopicDto: CreatePhaseSubmitTopicDto,
        force: boolean = false
    ) {
        return this.createPhaseProvider.createPhaseSubmitTopic(actorId, periodId, createPhaseSubmitTopicDto, force)
    }

    async createPhaseOpenReg(
        actorId: string,
        periodId: string,
        createOpenRegPhaseDto: CreateOpenRegPhaseDto,
        force: boolean = false
    ) {
        return this.createPhaseProvider.createPhaseOpenRegistration(actorId, periodId, createOpenRegPhaseDto, force)
    }

    async createPhaseExecution(
        actorId: string,
        periodId: string,
        createExecutionPhaseDto: CreateExecutionPhaseDto,
        force: boolean = false
    ): Promise<{ success: boolean; message: string }> {
        return this.createPhaseProvider.createCreateExecutionPhaseDto(actorId, periodId, createExecutionPhaseDto, force)
    }
    async createPhaseCompletion(actorId: string, periodId: string, createCompletionPhaseDto: CreateCompletionPhaseDto) {
        return this.createPhaseProvider.createCompletionPhase(actorId, periodId, createCompletionPhaseDto)
    }

    async updatePhase(periodId: string, phaseId: string, updatePhaseDto: UpdatePeriodPhaseDto) {
        const period = await this.getPeriodInfo(periodId)
        const phases = period?.phases
        if (!phases || phases.length === 0) {
            throw new PeriodPhaseNotFoundException()
        }
        if (phases) {
            const phaseIndex = phases.findIndex((phase) => phase._id.toString() === phaseId)
            if (phaseIndex === -1) {
                throw new PeriodPhaseNotFoundException()
            } else {
                const updatedPhase = {
                    ...phases[phaseIndex],
                    ...updatePhaseDto
                }
                const newPhases = [...phases.slice(0, phaseIndex), updatedPhase, ...phases.slice(phaseIndex + 1)]
                const newPeriod = { ...period, phases: newPhases }
                this.update(periodId, newPeriod)
            }
        }
    }

    async getTopicsInPeriod(periodId: string, query: RequestGetPeriodsDto) {
        const period = await this.getTopicProvider.getTopicsInPeriod(periodId, query)
        return period
    }

    async getTopicsInPhase(phaseId: string, query: RequestGetTopicsInPhaseDto) {
        const period = await this.getTopicProvider.getTopicsInPhase(phaseId, query)
        return period
    }

    async changeStatusAllTopicsInPeriod(periodId: string, newStatus: string, newPhaseId: string) {}
    // statistics
    async boardGetStatisticsSubmitTopicPhase(periodId: string) {
        //lấy thống kê liên quan tới đề tài
        const topicFigures = await this.getStatisticsTopicsProvider.boardGetTopicsStatistic(
            periodId,
            PeriodPhaseName.SUBMIT_TOPIC
        )
        //lấy thống kê các thong tin liên quan khác (nếu có)
        return topicFigures
    }
    async boardGetStatisticsOpenRegistrationPhase(periodId: string) {
        //lấy thống kê liên quan tới đề tài
        const topicFigures = await this.getStatisticsTopicsProvider.boardGetTopicsStatistic(
            periodId,
            PeriodPhaseName.OPEN_REGISTRATION
        )
        //lấy thống kê các thong tin liên quan khác (nếu có)
        return topicFigures
    }
    async boardGetStatisticsExecutionPhase(periodId: string) {
        //lấy thống kê liên quan tới đề tài
        const topicFigures = await this.getStatisticsTopicsProvider.boardGetTopicsStatistic(
            periodId,
            PeriodPhaseName.EXECUTION
        )
        //lấy thống kê các thong tin liên quan khác (nếu có)
        return topicFigures
    }
    async boardGetStatisticsCompletionPhase(periodId: string) {
        //lấy thống kê liên quan tới đề tài
        const topicFigures = await this.getStatisticsTopicsProvider.boardGetTopicsStatistic(
            periodId,
            PeriodPhaseName.COMPLETION
        )
        //lấy thống kế các thông tin liên quan khác (nếu có)
        return topicFigures
    }
    async lecturerGetStatisticsSubmitTopicPhase(periodId: string, lecturerId: string) {
        //lấy thống kê liên quan tới đề tài
        const topicFigures = await this.getStatisticsTopicsProvider.lecturerGetTopicsStatistic(
            periodId,
            lecturerId,
            PeriodPhaseName.SUBMIT_TOPIC
        )
        //lấy thống kê các thong tin liên quan khác (nếu có)
        return topicFigures
    }
    async lecturerGetStatisticsOpenRegistrationPhase(periodId: string, lecturerId: string) {
        //lấy thống kê liên quan tới đề tài
        const topicFigures = await this.getStatisticsTopicsProvider.lecturerGetTopicsStatistic(
            periodId,
            lecturerId,
            PeriodPhaseName.OPEN_REGISTRATION
        )
        //lấy thống kê các thong tin liên quan khác (nếu có)
        return topicFigures
    }
    async lecturerGetStatisticsExecutionPhase(periodId: string, lecturerId: string) {
        //lấy thống kê liên quan tới đề tài
        const topicFigures = await this.getStatisticsTopicsProvider.lecturerGetTopicsStatistic(
            periodId,
            lecturerId,
            PeriodPhaseName.EXECUTION
        )
        //lấy thống kê các thong tin liên quan khác (nếu có)
        return topicFigures
    }
    async lecturerGetStatisticsCompletionPhase(periodId: string, lecturerId: string) {
        //lấy thống kê liên quan tới đề tài
        const topicFigures = await this.getStatisticsTopicsProvider.lecturerGetTopicsStatistic(
            periodId,
            lecturerId,
            PeriodPhaseName.COMPLETION
        )
        //lấy thống kê các thong tin liên quan khác (nếu có)
        return topicFigures
    }
    async getSubmissionStatus(lecturerId: string, facultyId: string): Promise<GetCustomRequestDto> {
        const res = await this.iPeriodRepository.getSubmissionStatus(lecturerId, facultyId)
        let submittedCount = 0
        if (res.isEligible) {
            submittedCount = await this.getTopicProvider.getLecturerSubmittedTopicNum(lecturerId)
            return {
                ...res,
                requirements: {
                    minTopics: res.minTopics,
                    submittedTopics: submittedCount
                }
            }
        }
        return {
            ...res
        }
    }

    async getCurrentPeriodInfo(facultyId: string): Promise<Period | null> {
        return this.iPeriodRepository.getCurrentPeriodInfo(facultyId)
    }
}
