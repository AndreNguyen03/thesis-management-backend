import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Period } from '../../schemas/period.schemas'
import { IPeriodRepository } from '../periods.repository.interface'
import mongoose, { Model } from 'mongoose'
import { RequestGetPeriodsDto } from '../../dtos/request-get-all.dto'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { GetCurrentPhaseResponseDto } from '../../dtos/period-phase.dtos'
import { BadRequestException } from '@nestjs/common'
import { plainToClass, plainToInstance } from 'class-transformer'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'

export class PeriodRepository extends BaseRepositoryAbstract<Period> implements IPeriodRepository {
    constructor(
        @InjectModel(Period.name) private readonly periodModel: Model<Period>,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(periodModel)
    }
    async getCurrentPhase(periodId: string): Promise<GetCurrentPhaseResponseDto> {
        const res = await this.periodModel
            .findOne(
                { _id: new mongoose.Types.ObjectId(periodId), isDeleted: false, 'phases.phase': '$currentPhase' },
                { projection: { currentPhase: 1, 'phases.$.endtime': 1 } }
            )
            .exec()
        if (!res) {
            throw new BadRequestException('Không tìm thấy kỳ')
        }
        return plainToInstance(GetCurrentPhaseResponseDto, res)
    }
    async getAllPeriods(query: RequestGetPeriodsDto): Promise<Paginated<Period>> {
        return this.paginationProvider.paginateQuery<Period>(query, this.periodModel)
    }
}
