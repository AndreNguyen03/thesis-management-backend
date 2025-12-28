import { BadRequestException, Inject, Injectable, NotFoundException, RequestTimeoutException } from '@nestjs/common'
import { IPeriodRepository } from '../repository/periods.repository.interface'
import {
    CreatePeriodDto,
    GetCurrentPeriod,
    GetPeriodDto,
    PeriodStatsQueryParams,
    UpdatePeriodDto
} from '../dtos/period.dtos'
import { BaseServiceAbstract } from '../../../shared/base/service/base.service.abstract'
import { Period } from '../schemas/period.schemas'
import { CreatePhaseProvider } from '../providers/create-phase.provider'
import { RequestGetPeriodsDto } from '../dtos/request-get-all.dto'
import { plainToClass, plainToInstance } from 'class-transformer'
import { PeriodStatus, PeriodType } from '../enums/periods.enum'
import {
    ConfigPhaseSubmitTopicDto,
    ConfigCompletionPhaseDto,
    ConfigExecutionPhaseDto,
    ConfigOpenRegPhaseDto,
    UpdatePeriodPhaseDto
} from '../dtos/period-phases.dtos'
import { PeriodPhaseNotFoundException } from '../../../common/exceptions/period-exceptions'
import { GetTopicProvider } from '../../topics/providers/get-topic.provider'
import { PaginatedTopicsInPeriod, RequestGetTopicsInPhaseParams } from '../../topics/dtos'
import { GetTopicStatusProvider } from '../../topics/providers/get-status-topic.provider'
import { GetPeriodInfoProvider } from '../providers/get-period-info.provider'
import { GetStatisticsTopicsProvider } from '../../topics/providers/get-statistics-topics.provider'

import { PeriodPhaseName, PeriodPhaseStatus } from '../enums/period-phases.enum'
import {
    PeriodDetail,
    PeriodPhaseDetail,
    Phase1Response,
    Phase2Response,
    Phase3Response,
    Phase4Response
} from '../dtos/phase-resolve.dto'
import {
    GetTopicStatisticInSubmitPhaseDto,
    LecGetTopicStatisticInSubmitPhaseDto
} from '../../topics/dtos/get-statistics-topics.dtos'
import { NotificationPublisherService } from '../../notifications/publisher/notification.publisher.service'
import mongoose from 'mongoose'

@Injectable()
export class PeriodsService extends BaseServiceAbstract<Period> {
    constructor(
        @Inject('IPeriodRepository') private readonly iPeriodRepository: IPeriodRepository,
        private readonly createPhaseProvider: CreatePhaseProvider,
        private readonly getTopicProvider: GetTopicProvider,
        private readonly getTopicStatusProvider: GetTopicStatusProvider,
        private readonly getStatisticsTopicsProvider: GetStatisticsTopicsProvider,
        private readonly notificationPublisherService: NotificationPublisherService
    ) {
        super(iPeriodRepository)
    }

    //kiểm tra xem pha đã có thể đóng hay chưa
    async closePhase(
        periodId: string,
        phase: PeriodPhaseName
        // user: ActiveUserData
    ): Promise<Phase1Response | Phase2Response | Phase3Response | Phase4Response> {
        const period = await this.iPeriodRepository.getDetailPeriod(periodId)
        const phaseDetail = period?.phases.find((p) => p.phase === phase && p.status === 'timeout')
        //const canTriggerNextPhase = phaseDetail?.endTime
        if (!period) throw new NotFoundException('Không tìm thấy đợt')
        if (!phaseDetail) throw new NotFoundException('Không tìm thấy pha')
        switch (phase) {
            case PeriodPhaseName.SUBMIT_TOPIC:
                return await this.handleCloseSubmitTopicPhase(phaseDetail, period)
            case PeriodPhaseName.OPEN_REGISTRATION:
                return await this.handleCloseOpenRegistrationPhase(phaseDetail, period)
            case PeriodPhaseName.EXECUTION:
                return await this.handleCloseExecutionPhase(phaseDetail, period)
            case PeriodPhaseName.COMPLETION:
                return await this.handleCloseCompletionPhase(phaseDetail)
            default:
                throw new BadRequestException('Pha không hợp lệ!')
        }
    }
    async handleCloseCompletionPhase(phaseDetail: PeriodPhaseDetail): Promise<Phase4Response> {
        return {
            periodId: phaseDetail._id.toString(),
            canTriggerNextPhase: this.computeCanTriggerNextPhase(phaseDetail, undefined, false)
        }
    }
    async handleCloseExecutionPhase(phaseDetail: PeriodPhaseDetail, period: PeriodDetail): Promise<Phase3Response> {
        const getOverDueTopics = await this.getTopicProvider.getOverDueTopics(period._id.toString())
        //Lấy các đề tài đã tạm dừng hoặc deleyed
        const getDelayed = await this.getTopicProvider.getPausedOrDelayedTopics(period._id.toString())
        //lấy các đề tài chờ GV đánh giá
        const pendingReview = await this.getTopicProvider.getPendingReviewTopics(period._id.toString())

        return {
            periodId: period._id.toString(),
            phase: PeriodPhaseName.EXECUTION,
            overdueTopics: getOverDueTopics,
            pausedOrDelayedTopics: getDelayed,
            pendingLecturerReview: pendingReview,
            canTriggerNextPhase: this.computeCanTriggerNextPhase(phaseDetail, undefined, false)
        }
    }

    async handleCloseOpenRegistrationPhase(
        phaseDetail: PeriodPhaseDetail,
        period: PeriodDetail
    ): Promise<Phase2Response> {
        let result: Phase2Response = {
            periodId: period._id.toString(),
            phase: PeriodPhaseName.OPEN_REGISTRATION,
            resolveTopics: { draft: [], executing: [] },
            canTriggerNextPhase: false
        }
        const currentIndex = period.phases.findIndex((p) => p.phase === phaseDetail.phase)
        const nextPhase = period.phases[currentIndex + 1]

        result.canTriggerNextPhase = this.computeCanTriggerNextPhase(phaseDetail, nextPhase, false)

        return result
    }
    async handleCloseSubmitTopicPhase(phaseDetail: PeriodPhaseDetail, period: PeriodDetail) {
        //  console.log('[handleCloseSubmitTopicPhase] Start processing', { period, phaseDetail })

        // init dto
        let result: Phase1Response = {
            periodId: period._id.toString(),
            phase: 'submit_topic',
            missingTopics: [],
            pendingTopics: 0,
            canTriggerNextPhase: false
        }

        const minTopicsRequired = phaseDetail.minTopicsPerLecturer
        //  console.log('[handleCloseSubmitTopicPhase] minTopicsRequired:', minTopicsRequired)

        // loop get missing topic count per lecturer

        for (const lec of phaseDetail.requiredLecturers) {
            //  console.log('[handleCloseSubmitTopicPhase] Processing lecturer:', lec._id, lec.fullName)

            const lecStatsPhase1 = (await this.lecturerGetStatisticsSubmitTopicPhase(
                period._id.toString(),
                lec._id
            )) as LecGetTopicStatisticInSubmitPhaseDto

            console.log(lecStatsPhase1)

            const submited = lecStatsPhase1.submittedTopicsNumber

            if (submited < minTopicsRequired) {
                const missing = minTopicsRequired - submited
                console.log(`[handleCloseSubmitTopicPhase] Lecturer missing topics: ${missing}`)

                result.missingTopics.push({
                    lecturerId: lec._id,
                    lecturerEmail: lec.email,
                    minTopicsRequired: minTopicsRequired,
                    lecturerName: lec.fullName,
                    submittedTopicsCount: submited,
                    missingTopicsCount: missing
                })
            }
        }

        // get board stats to get remaining submitted
        const boardStatsPhase1 = (await this.boardGetStatisticsInPeriod(period._id.toString(), {
            phase: phaseDetail.phase
        })) as GetTopicStatisticInSubmitPhaseDto

        result.pendingTopics = boardStatsPhase1.submittedTopicsNumber

        const currentIndex = period.phases.findIndex((p) => p.phase === phaseDetail.phase)
        const nextPhase = period.phases[currentIndex + 1]

        result.canTriggerNextPhase = this.computeCanTriggerNextPhase(
            phaseDetail,
            nextPhase,
            result.missingTopics.length > 0 && result.pendingTopics > 0
        )
        return result
    }

    computeCanTriggerNextPhase(
        currentPhase: PeriodPhaseDetail,
        nextPhase: PeriodPhaseDetail | undefined,
        hasPending: boolean
    ): boolean {
        const now = new Date()

        const isEnded = currentPhase.endTime != null && new Date(currentPhase.endTime) < now

        const nextPhaseIsConfigured = nextPhase != null && nextPhase.startTime != null

        return isEnded && !hasPending && !nextPhaseIsConfigured
    }

    async createNewPeriod(actorId: string, facultyId: string, createPeriodDto: CreatePeriodDto): Promise<string> {
        const periodData = {
            ...createPeriodDto,
            faculty: facultyId,
            actorId
        }
        const newPeriod = plainToClass(Period, periodData)
        const res = await this.iPeriodRepository.createNewPeriod(newPeriod)
        const periodResult = plainToInstance(GetPeriodDto, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
        return await this.notificationPublisherService.sendNewSemesticNotification(facultyId, periodResult)
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
            const res = await this.update(periodId, {
                ...periodDto,
                startTime: new Date(periodDto.startTime!),
                endTime: new Date(periodDto.endTime!)
            })
            if (!res) {
                throw new NotFoundException('Kỳ không tồn tại')
            }
            // Handle status based on time and completion
            const now = new Date()
            let status: string

            if (!res.startTime || !res.endTime) {
                status = 'pending'
            } else if (now < new Date(res.startTime)) {
                status = 'pending'
            } else if (now >= new Date(res.startTime) && now <= new Date(res.endTime)) {
                status = 'active'
            } else if (res.status === PeriodStatus.Completed) {
                status = PeriodStatus.Completed
            } else {
                status = 'timeout'
            }

            return { ...res, status }
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

    async getPeriodInfo(periodId: string): Promise<PeriodDetail | null> {
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

    async getTopicsInPhase(phaseId: string, query: RequestGetTopicsInPhaseParams): Promise<PaginatedTopicsInPeriod> {
        const period = await this.getTopicProvider.getTopicsInPhase(phaseId, query)
        return period
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

    async getCurrentPeriodInfo(facultyId: string, type: string): Promise<GetPeriodDto | null> {
        return await this.iPeriodRepository.getPeriodInfo(facultyId, type)
    }

    async getDashboardCurrentPeriod(facultyId: string) : Promise<any> {
        return await this.iPeriodRepository.getDashboardCurrentPeriod(facultyId)
    }
 
    async getCurrentPeriods(facultyId: string, role: string, userId: string): Promise<GetCurrentPeriod[]> {
        return await this.iPeriodRepository.getCurrentPeriods(facultyId, role, userId)
    }
    async checkCurrentPeriod(periodId: string): Promise<boolean> {
        return await this.iPeriodRepository.checkCurrentPeriod(periodId)
    }
    async getPeriodById(periodId: string): Promise<GetPeriodDto> {
        const res = await this.iPeriodRepository.getPeriodById(periodId)
        return plainToInstance(GetPeriodDto, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    async completePeriod(periodId: string): Promise<void> {
        const period = await this.getPeriodById(periodId)
        if (!period) {
            throw new NotFoundException('Kỳ không tồn tại')
        }
        if (period.status === PeriodStatus.Completed) {
            throw new BadRequestException('Kỳ đã được hoàn thành')
        }
        await this.iPeriodRepository.completePeriod(periodId)
    }
}
