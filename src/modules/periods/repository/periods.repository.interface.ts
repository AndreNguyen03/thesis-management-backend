import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { GetCurrentPhaseResponseDto } from '../dtos/period-phase.dtos'
import { RequestGetPeriodsDto } from '../dtos/request-get-all.dto'
import { Period, PeriodPhase } from '../schemas/period.schemas'

export interface IPeriodRepository extends BaseRepositoryInterface<Period> {
    getAllPeriods(query: RequestGetPeriodsDto): Promise<Paginated<Period>>
    getCurrentPhase(periodId: string): Promise<GetCurrentPhaseResponseDto>
    deletePeriod(periodId: string): Promise<boolean>
    createPhaseInPeriod(newPhase: PeriodPhase, periodId: string): Promise<boolean>
}
