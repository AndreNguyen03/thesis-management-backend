import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { Faculty } from '../../schemas/faculty.schema'
import { FacultyRepositoryInterface } from '../faculty.repository.interface'
import { Model } from 'mongoose'

export class FacultyRepository extends BaseRepositoryAbstract<Faculty> implements FacultyRepositoryInterface {
    constructor(
        @InjectModel(Faculty.name)
        private readonly facultyModel: Model<Faculty>
    ) {
        super(facultyModel)
    }

    async createMany(facultys: Partial<Faculty>[]): Promise<boolean> {
        const result = await this.facultyModel.insertMany(facultys)
        return result.length > 0
    }
}
