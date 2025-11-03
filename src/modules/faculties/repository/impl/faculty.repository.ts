import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Faculty } from '../../schemas/faculty.schema'
import { FacultyRepositoryInterface } from '../faculty.repository.interface'
import { Model } from 'mongoose'

export class FacultyRepository extends BaseRepositoryAbstract<Faculty> implements FacultyRepositoryInterface {
    constructor(@InjectModel(Faculty.name) private readonly facultyRepository: Model<Faculty>) {
        super(facultyRepository)
    }

    async createMany(faculties: Faculty[]): Promise<boolean> {
        if (!faculties || faculties.length === 0) return false

        try {
            await this.facultyRepository.insertMany(faculties, { ordered: false })
            return true
        } catch (error) {
            console.error('Error creating many faculties:', error)
            return false
        }
    }
}
