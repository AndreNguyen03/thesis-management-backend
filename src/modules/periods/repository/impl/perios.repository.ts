import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Period } from '../../schemas/period.schemas'
import { IPeriodRepository } from '../periods.repository.interface'
import { Model } from 'mongoose'
import { RequestGetPeriodsDto } from '../../dtos/request-get-all.dto'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'

export class PeriodRepository extends BaseRepositoryAbstract<Period> implements IPeriodRepository {
    constructor(
        @InjectModel(Period.name) private readonly periodModel: Model<Period>,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(periodModel)
    }
    getAllPeriods(query: RequestGetPeriodsDto) {
        throw new Error('Method not implemented.')
    }
}
