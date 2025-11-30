import { Inject, Injectable, RequestTimeoutException } from '@nestjs/common'
import { IPeriodRepository } from '../repository/periods.repository.interface'
import { CreatePeriodDto, PeriodStatsQueryParams, UpdatePeriodDto } from '../dtos/period.dtos'
import { BaseServiceAbstract } from '../../../shared/base/service/base.service.abstract'
import { Period } from '../schemas/period.schemas'
import { CreatePhaseProvider } from '../providers/create-phase.provider'
import { RequestGetPeriodsDto } from '../dtos/request-get-all.dto'
import { plainToClass } from 'class-transformer'
import { PeriodStatus } from '../enums/periods.enum'
import {
    ConfigPhaseSubmitTopicDto,
    ConfigCompletionPhaseDto,
    ConfigExecutionPhaseDto,
    ConfigOpenRegPhaseDto,
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
        const newPeriod = plainToClass(Period, periodData)
        const createdPeriod = await this.iPeriodRepository.createNewPeriod(newPeriod)
        const res = await this.createPhaseProvider.initalizePhasesForNewPeriod(createdPeriod._id.toString())
        if (res && phaseSubmitTopic) {
            await this.configPhaseSubmitTopic(actorId, createdPeriod._id.toString(), phaseSubmitTopic)
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
        const period = await this.iPeriodRepository.getDetailPeriod(periodId)
        return period
    }

    async configPhaseSubmitTopic(
        actorId: string,
        periodId: string,
        createPhaseSubmitTopicDto: ConfigPhaseSubmitTopicDto,
        force: boolean = false
    ) {
        return this.createPhaseProvider.configPhaseSubmitTopic(actorId, periodId, createPhaseSubmitTopicDto, force)
    }

    async configPhaseOpenReg(
        actorId: string,
        periodId: string,
        configOpenRegPhaseDto: ConfigOpenRegPhaseDto,
        force: boolean = false
    ) {
        return this.createPhaseProvider.configPhaseOpenRegistration(actorId, periodId, configOpenRegPhaseDto, force)
    }

    async configPhaseExecution(
        actorId: string,
        periodId: string,
        configExecutionPhaseDto: ConfigExecutionPhaseDto,
        force: boolean = false
    ): Promise<{ success: boolean; message: string }> {
        return this.createPhaseProvider.configPhaseExecution(actorId, periodId, configExecutionPhaseDto, force)
    }
    async configPhaseCompletion(actorId: string, periodId: string, configCompletionPhaseDto: ConfigCompletionPhaseDto) {
        return this.createPhaseProvider.configCompletionPhase(actorId, periodId, configCompletionPhaseDto)
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

    // async getTopicsOfPeriod(periodId: string, query: RequestGetPeriodsDto) {
    //     const period = await this.getTopicProvider.getTopicsOfPeriod(periodId, query)
    //     return period
    // }

    async getTopicsInPhase(phaseId: string, query: RequestGetTopicsInPhaseDto) {
        const period = await this.getTopicProvider.getTopicsInPhase(phaseId, query)
        return period
    }

    async changeStatusAllTopicsInPeriod(periodId: string, newStatus: string, newPhaseId: string) {


        
    }
    // statistics
    async boardGetStatisticsInPeriod(periodId: string, query: PeriodStatsQueryParams) {
        //lấy thống kê liên quan tới đề tài
        const periodFigures = await this.getStatisticsTopicsProvider.boardGetTopicsStatistic(periodId, query.phase)
        //lấy thống kê các thong tin liên quan khác (nếu có)
        return periodFigures
    }
    //cho đi
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
