import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Period, PeriodPhase } from '../../schemas/period.schemas'
import { IPeriodRepository } from '../periods.repository.interface'
import mongoose, { Model } from 'mongoose'
import { RequestGetPeriodsDto } from '../../dtos/request-get-all.dto'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { GetCurrentPhaseResponseDto } from '../../dtos/period-phase.dtos'
import { BadRequestException, RequestTimeoutException } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'

export class PeriodRepository extends BaseRepositoryAbstract<Period> implements IPeriodRepository {
    constructor(
        @InjectModel(Period.name) private readonly periodModel: Model<Period>,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(periodModel)
    }
    async createPhaseInPeriod(newPhase: PeriodPhase, periodId: string): Promise<boolean> {
        try {
            const res = await this.periodModel.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(periodId), isDeleted: false },
                {
                    $push: { phases: newPhase },
                    $set: { currentPhase: newPhase.phase }
                }
            )
            return res !== null
        } catch (error) {
            throw new RequestTimeoutException()
        }
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
    async getAllPeriods(facultyId: string, query: RequestGetPeriodsDto): Promise<Paginated<Period>> {
        let pipelineSub: any[] = []
        //Tìm kiếm những period trong khoa
        pipelineSub.unshift({ $match: { facultyId: new mongoose.Types.ObjectId(facultyId), deleted_at: null } })
        return this.paginationProvider.paginateQuery<Period>(query, this.periodModel, pipelineSub)
    }
    async deletePeriod(periodId: string): Promise<boolean> {
        const result = await this.periodModel.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(periodId), deleted_at: null } },
            { $project: { phasesCount: { $size: '$phases' } } }
        ])

        if (result.length === 0) {
            throw new BadRequestException('Kỳ không tồn tại hoặc đã bị xóa')
        }
        if (result[0].phasesCount > 0) {
            throw new BadRequestException('Kỳ này đang có giai đoạn có hiệu lực, không thể xóa')
        }

        const res = await this.periodModel.updateOne(
            { _id: new mongoose.Types.ObjectId(periodId), deleted_at: null },
            { deleted_at: new Date() }
        )
        return res.modifiedCount > 0
    }
}
