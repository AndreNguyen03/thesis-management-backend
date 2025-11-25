import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { GetCurrentPhaseResponseDto } from '../dtos/period-phases.dtos'
import { GetPeriodDto } from '../dtos/period.dtos'
import { RequestGetPeriodsDto } from '../dtos/request-get-all.dto'
import { Period, PeriodPhase } from '../schemas/period.schemas'

export interface IPeriodRepository extends BaseRepositoryInterface<Period> {
    getAllPeriods(facultyId: string, query: RequestGetPeriodsDto): Promise<Paginated<Period>>
    getCurrentPhase(periodId: string): Promise<GetCurrentPhaseResponseDto>
    deletePeriod(periodId: string): Promise<boolean>
    configPhaseInPeriod(newPhase: PeriodPhase, periodId: string): Promise<boolean>
    getSubmissionStatus(
        lecturerId: string,
        facultyId: string
    ): Promise<{
        currentPeriod: string | null
        currentPhase: string | null
        isEligible: boolean
        reason: string | null
        minTopics: number
    }>
    getCurrentPeriodInfo(facultyId: string)
    getDetailPeriod(periodId: string)
    initalizePhasesForNewPeriod(periodId: string): Promise<boolean>
    createNewPeriod(period: Period): Promise<Period>
}
