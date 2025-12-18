import { Inject, Injectable } from '@nestjs/common'
import { IPeriodRepository } from '../repository/periods.repository.interface'
import { GetPeriodDto } from '../dtos/period.dtos'

@Injectable()
export class GetPeriodInfoProvider {
    constructor(@Inject('IPeriodRepository') private readonly iPeriodRepository: IPeriodRepository) {}
    async getPeriodInfo(periodId: string): Promise<GetPeriodDto> {
        return await this.iPeriodRepository.getPeriodById(periodId)
    }
}
