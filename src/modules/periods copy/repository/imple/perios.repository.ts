import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Period } from '../../schemas/period.schemas'
import { IPeriodRepository } from '../periods.repository.interface'
import { Model } from 'mongoose'

export class PeriodRepository extends BaseRepositoryAbstract<Period> implements IPeriodRepository {
    constructor(@InjectModel(Period.name) private readonly periodModel: Model<Period>) {
        super(periodModel)
    }
}
