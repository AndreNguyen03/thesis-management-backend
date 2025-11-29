import { Injectable } from '@nestjs/common'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Major } from '../../schemas/majors.schemas'
import { IMajorRepository } from '../majors.repository.interface'
import mongoose, { Model } from 'mongoose'
import { InjectModel } from '@nestjs/mongoose'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { PaginationQueryDto } from '../../../../common/pagination-an/dtos/pagination-query.dto'
@Injectable()
export class MajorsRepository extends BaseRepositoryAbstract<Major> implements IMajorRepository {
    constructor(
        @InjectModel(Major.name) private readonly majorModel: Model<Major>,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(majorModel)
    }
    async getMajorsByFacultyId(facultyId: string, query: PaginationQueryDto): Promise<Paginated<Major>> {
        let pipelineSub: any[] = []
        pipelineSub.push({
            $match: {
                facultyId: new mongoose.Types.ObjectId(facultyId),
                deleted_at: null
            }
        })
        return await this.paginationProvider.paginateQuery<Major>(query, this.majorModel, pipelineSub)
    }
}
