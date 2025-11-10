import { Inject, Injectable } from '@nestjs/common'
import { IPeriodRepository } from '../repository/periods.repository.interface'
import { CreatePeriodDto, UpdatePeriodDto } from '../dtos/period.dtos'
import { BaseServiceAbstract } from '../../../shared/base/service/base.service.abstract'
import { Period, PeriodPhases } from '../schemas/period.schemas'
import { CreatePhaseProvider } from './create-phase.provider'
import { RequestGetPeriodsDto } from '../dtos/request-get-all.dto'
import { plainToClass } from 'class-transformer'
import { PeriodStatus } from '../enums/periods.enum'
import {
    CreateCompletionPhaseDto,
    CreateExecutionPhaseDto,
    CreateOpenRegPhaseDto,
    CreatePhaseSubmitTopicDto,
    UpdatePeriodPhaseDto
} from '../dtos/period-phases'
import { PeriodPhaseNotFoundException } from '../../../common/exceptions/period-exceptions'
import { GetTopicProvider } from '../../topics/providers/get-topic.provider'
import { Paginated } from '../../../common/pagination/interface/paginated.interface'
import { RequestGetTopicsInPhaseDto } from '../../topics/dtos'

@Injectable()
export class PeriodsService extends BaseServiceAbstract<Period> {
    constructor(
        @Inject('IPeriodRepository') private readonly iPeriodRepository: IPeriodRepository,
        @Inject('CreatePhaseProvider') private readonly createPhaseProvider: CreatePhaseProvider,
        private readonly getTopicProvider: GetTopicProvider
    ) {
        super(iPeriodRepository)
    }
    async createNewPeriod(createPeriodDto: CreatePeriodDto) {
        const { phaseSubmitTopic, ...nest } = createPeriodDto
        const newPeriod = await this.create(nest)
        if (phaseSubmitTopic) {
            await this.createPhaseSubmitTopic(newPeriod._id.toString(), phaseSubmitTopic)
        }
    }
    async getAllPeriods(query: RequestGetPeriodsDto) {
        return this.iPeriodRepository.getAllPeriods(query)
    }

    async deletePeriod(id: string) {
        return this.remove(id)
    }

    // update period info
    async adjustPeriod(periodId: string, periodDto: UpdatePeriodDto) {
        return this.update(periodId, periodDto)
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

    async createPhaseSubmitTopic(periodId: string, createPhaseSubmitTopicDto: CreatePhaseSubmitTopicDto) {
        const newPhaseSubmitTopic = plainToClass(PeriodPhases, createPhaseSubmitTopicDto)
        return this.createPhaseProvider.createPhaseInPeriod(newPhaseSubmitTopic, periodId)
    }

    async createPhaseOpenReg(periodId: string, createOpenRegPhaseDto: CreateOpenRegPhaseDto) {
        const newOpenRegPhase = plainToClass(PeriodPhases, createOpenRegPhaseDto)
        return this.createPhaseProvider.createPhaseInPeriod(newOpenRegPhase, periodId)
    }

    async createPhaseExecution(periodId: string, createExecutionPhaseDto: CreateExecutionPhaseDto) {
        const newExecutionPhase = plainToClass(PeriodPhases, createExecutionPhaseDto)
        return this.createPhaseProvider.createPhaseInPeriod(newExecutionPhase, periodId)
    }
    async createPhaseCompletion(periodId: string, createCompletionPhaseDto: CreateCompletionPhaseDto) {
        const newCompletionPhase = plainToClass(PeriodPhases, createCompletionPhaseDto)
        return this.createPhaseProvider.createPhaseInPeriod(newCompletionPhase, periodId)
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
    async changeStatusTopicInPeriod(periodId: string, topicId: string, newStatus: string) {}
    async changeStatusAllTopicsInPeriod(periodId: string, newStatus: string, newPhaseId: string) {}
}
