import { Inject, Injectable } from '@nestjs/common'
import { BaseServiceAbstract } from '../../../shared/base/service/base.service.abstract'
import { Faculty } from '../schemas/faculty.schema'
import { FacultyRepositoryInterface } from '../repository/faculty.repository.interface'
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination/interface/paginated.interface'

@Injectable()
export class FacultyService extends BaseServiceAbstract<Faculty> {
    constructor(@Inject('FacultyRepositoryInterface') private readonly facultyRepository: FacultyRepositoryInterface) {
        super(facultyRepository)
    }

    async createFaculty(createDto: Partial<Faculty>): Promise<Faculty> {
        return this.create(createDto)
    }

    async createManyFaculties(
        faculties: Partial<Faculty>[]
    ): Promise<{ success: boolean; createdCount?: number; errors?: any[] }> {
        if (!faculties || faculties.length === 0) return { success: false }

        try {
            const result = await this.facultyRepository.createMany(faculties as Faculty[])
            return { success: result }
        } catch (error: any) {
            console.error('Error creating many faculties:', error)
            return { success: false, errors: [error.message] }
        }
    }

    async getAllFaculties(query: PaginationQueryDto): Promise<Paginated<Faculty>> {
        const filter: any = {}

        if (query.search_by && query.query) {
            // search dynamic theo field client cung cấp
            filter[query.search_by] = { $regex: query.query, $options: 'i' }
        }

        const sort: any = {}
        if (query.sort_by) {
            sort[query.sort_by] = query.sort_order === 'desc' ? -1 : 1
        }

        const page = query.page ?? 1
        const limit = query.page_size ?? 10
        const skip = (page - 1) * limit

        const datas = await this.facultyRepository.findAll(filter, { skip, limit, sort })

        return datas
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
