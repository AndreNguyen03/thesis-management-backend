import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { Major } from '../../schemas/major.schema'
import { MajorRepositoryInterface } from '../major.repository.interface'
import { Model } from 'mongoose'

export class MajorRepository extends BaseRepositoryAbstract<Major> implements MajorRepositoryInterface {
    constructor(
        @InjectModel(Major.name)
        private readonly MajorModel: Model<Major>
    ) {
        super(MajorModel)
    }

    async createMany(majors: Partial<Major>[]): Promise<boolean> {
        const result = await this.MajorModel.insertMany(majors)
        return result.length > 0
    }
}
