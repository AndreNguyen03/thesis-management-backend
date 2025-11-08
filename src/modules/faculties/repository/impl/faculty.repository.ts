import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Faculty } from '../../schemas/faculty.schema'
import { FacultyRepositoryInterface } from '../faculty.repository.interface'
import { Model } from 'mongoose'
import { CreateFacultyDto } from '../../dtos/faculty.dtos'
import { RequestGetFacultyDto } from '../../dtos/request-get-faculty.dtos'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'

export class FacultyRepository extends BaseRepositoryAbstract<Faculty> implements FacultyRepositoryInterface {
    constructor(
        @InjectModel(Faculty.name) private readonly facultyRepository: Model<Faculty>,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(facultyRepository)
    }
    createFaculty(createFacultyDto: CreateFacultyDto): Promise<Faculty> {
        throw new Error('Method not implemented.')
    }
    async getAllFaculties(query: RequestGetFacultyDto): Promise<Paginated<Faculty>> {
        return await this.paginationProvider.paginateQuery(
            {
                limit: query.limit,
                page: query.page
            },
            this.facultyRepository
        )
    }
    async createManyFaculties(faculties: Faculty[]): Promise<number> {
        try {
            const res = await this.facultyRepository.insertMany(faculties)
            return Array.isArray(res) ? res.length : 0
        } catch (error) {
            console.error('Error creating many faculties:', error)
            return 0
        }
    }
}
