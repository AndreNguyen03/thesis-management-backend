import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { RequestGetPeriodsDto } from '../dtos/request-get-all.dto'
import { Period } from '../schemas/period.schemas'

export interface IPeriodRepository extends BaseRepositoryInterface<Period> {
    getAllPeriods(query: RequestGetPeriodsDto)
}
