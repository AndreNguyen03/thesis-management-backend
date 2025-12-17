import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { GetCurrentPhaseResponseDto } from '../dtos/period-phases.dtos'
import { GetCurrentPeriod, GetPeriodDto } from '../dtos/period.dtos'
import { PeriodDetail } from '../dtos/phase-resolve.dto'
import { RequestGetPeriodsDto } from '../dtos/request-get-all.dto'
import { Period, PeriodPhase } from '../schemas/period.schemas'

export interface IPeriodRepository extends BaseRepositoryInterface<Period> {
    getAllPeriods(facultyId: string, query: RequestGetPeriodsDto): Promise<Paginated<Period>>
    getCurrentPhase(periodId: string): Promise<GetCurrentPhaseResponseDto>
    deletePeriod(periodId: string): Promise<boolean>
    configPhaseInPeriod(newPhase: PeriodPhase, periodId: string): Promise<boolean>
    getPeriodInfo(facultyId: string, type: string): Promise<GetPeriodDto | null>
    getCurrentPeriods(facultyId: string, role: string): Promise<GetCurrentPeriod[]>
    getDetailPeriod(periodId: string): Promise<PeriodDetail | null>
    initalizePhasesForNewPeriod(periodId: string): Promise<Period>
    createNewPeriod(period: Period): Promise<Period>
    getPeriodById(periodId: string): Promise<Period>
    checkCurrentPeriod(periodId: string): Promise<boolean>
}
