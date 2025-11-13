import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { GetCurrentPhaseResponseDto } from '../dtos/period-phase.dtos'
import { RequestGetPeriodsDto } from '../dtos/request-get-all.dto'
import { Period } from '../schemas/period.schemas'

export interface IPeriodRepository extends BaseRepositoryInterface<Period> {
    getAllPeriods(query: RequestGetPeriodsDto): Promise<Paginated<Period>>
    getCurrentPhase(periodId: string): Promise<GetCurrentPhaseResponseDto>
}
