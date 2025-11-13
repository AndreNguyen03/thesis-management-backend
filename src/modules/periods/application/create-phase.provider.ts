import { Inject, Injectable } from '@nestjs/common'
import { IPeriodRepository } from '../repository/periods.repository.interface'
import { CreatePhaseSubmitTopicDto } from '../dtos/period-phases'
import { PeriodNotFoundException } from '../../../common/exceptions/period-exceptions'
import { PeriodPhases } from '../schemas/period.schemas'
import { plainToClass } from 'class-transformer'

@Injectable()
export class CreatePhaseProvider {
    constructor(@Inject('IPeriodRepository') private readonly iPeriodRepository: IPeriodRepository) {}
    async createPhaseInPeriod(phaseSubmitTopic: Partial<PeriodPhases>, periodId: string) {
        const period = await this.iPeriodRepository.findOneById(periodId)
        if (!period) {
            throw new PeriodNotFoundException()
        }
        const newPhase = plainToClass(PeriodPhases, phaseSubmitTopic)
        period.phases.push(newPhase)
        return await this.iPeriodRepository.update(periodId, { phases: period.phases })
    }
}
