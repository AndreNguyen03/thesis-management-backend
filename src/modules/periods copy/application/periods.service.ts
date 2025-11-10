import { Inject, Injectable } from '@nestjs/common'
import { IPeriodRepository } from '../repository/periods.repository.interface'
import { CreatePeriodDto } from '../dtos/create-period.dtos'
import { BaseServiceAbstract } from '../../../shared/base/service/base.service.abstract'
import { Period } from '../schemas/period.schemas'

@Injectable()
export class PeriodsService extends BaseServiceAbstract<Period> {
    constructor(@Inject('IPeriodRepository') private readonly iPeriodRepository: IPeriodRepository) {
        super(iPeriodRepository)
    }
    async createNewPeriod(createPeriodDto: CreatePeriodDto) {
        const { phaseSubmitTopic, ...nest } = createPeriodDto
        await this.create(nest)
        if (phaseSubmitTopic) {}
    }
}
