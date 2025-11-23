import { Inject, Injectable } from '@nestjs/common'
import { BaseServiceAbstract } from '../../../shared/base/service/base.service.abstract'
import { Faculty } from '../schemas/faculty.schema'
import { FacultyRepositoryInterface } from '../repository/faculty.repository.interface'
import { RequestGetFacultyDto } from '../dtos/request-get-faculty.dtos'
import { PaginationProvider } from '../../../common/pagination-an/providers/pagination.provider'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { CreateFacultyDto } from '../dtos/faculty.dtos'

@Injectable()
export class FacultyService extends BaseServiceAbstract<Faculty> {
    constructor(
        @Inject('FacultyRepositoryInterface') private readonly facultyRepository: FacultyRepositoryInterface,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(facultyRepository)
    }

    async findFacultyIdByName(name: string): Promise<string> {
        return this.facultyRepository.findFacultyIdByName(name)
    }

    async createFaculty(createDto: Partial<Faculty>): Promise<Faculty> {
        return this.create(createDto)
    }

    async createManyFaculties(
        faculties: CreateFacultyDto[]
    ): Promise<{ success: boolean; createdCount: number; errors?: any[] }> {
        if (!faculties || faculties.length === 0) return { success: false, createdCount: 0 }

        try {
            const result = await this.facultyRepository.createManyFaculties(faculties)
            return { success: true, createdCount: result }
        } catch (error: any) {
            console.error('Error creating many faculties:', error)
            return { success: false, createdCount: 0, errors: [error.message] }
        }
    }

    async getAllFaculties(query: RequestGetFacultyDto): Promise<Paginated<Faculty>> {
        return await this.facultyRepository.getAllFaculties(query)
    }

    async getFacultyById(id: string): Promise<Faculty | null> {
        return this.findOneById(id)
    }

    async updateFaculty(id: string, updateDto: Partial<Faculty>): Promise<Faculty | null> {
        return this.update(id, updateDto)
    }

    async deleteFaculty(id: string): Promise<boolean> {
        return this.remove(id)
    }
}
