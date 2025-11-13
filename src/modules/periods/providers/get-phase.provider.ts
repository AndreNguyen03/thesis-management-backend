import { Inject, Injectable } from '@nestjs/common'
import { IPeriodRepository } from '../repository/periods.repository.interface'
import { GetCurrentPhaseResponseDto } from '../dtos/period-phase.dtos'

@Injectable()
export class GetPhaseProvider {
    constructor(@Inject('IPeriodRepository') private readonly iPeriodRepository: IPeriodRepository) {}
    async getCurrentPhase(periodId: string): Promise<GetCurrentPhaseResponseDto> {
        return await this.iPeriodRepository.getCurrentPhase(periodId)
    }
}
