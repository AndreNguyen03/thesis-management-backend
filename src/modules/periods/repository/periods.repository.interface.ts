import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { GetCurrentPhaseResponseDto } from '../dtos/period-phases.dtos'
import { GetPeriodDto } from '../dtos/period.dtos'
import { PeriodDetail } from '../dtos/phase-resolve.dto'
import { RequestGetPeriodsDto } from '../dtos/request-get-all.dto'
import { Period, PeriodPhase } from '../schemas/period.schemas'

export interface IPeriodRepository extends BaseRepositoryInterface<Period> {
    getAllPeriods(facultyId: string, query: RequestGetPeriodsDto): Promise<Paginated<Period>>
    getCurrentPhase(periodId: string): Promise<GetCurrentPhaseResponseDto>
    deletePeriod(periodId: string): Promise<boolean>
    configPhaseInPeriod(newPhase: PeriodPhase, periodId: string): Promise<boolean>
    getCurrentPeriodInfo(facultyId: string, type: string): Promise<GetPeriodDto | null>
    getDetailPeriod(periodId: string): Promise<PeriodDetail | null>
    initalizePhasesForNewPeriod(periodId: string): Promise<boolean>
    createNewPeriod(period: Period): Promise<Period>
    getPeriodById(periodId: string): Promise<Period | null>
    checkCurrentPeriod(periodId: string): Promise<boolean>
}
