import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { BaseServiceAbstract } from '../../../shared/base/service/base.service.abstract'
import { Major } from '../schemas/majors.schemas'
import { IMajorRepository } from '../repository/majors.repository.interface'
import { CreateMajorDto } from '../dtos/create-major.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
@Injectable()
export class MajorsService extends BaseServiceAbstract<Major> {
    constructor(@Inject('IMajorRepository') private readonly majorRepositoryInterface: IMajorRepository) {
        super(majorRepositoryInterface)
    }
    async createMajor(createMajorDto: CreateMajorDto): Promise<Major> {
        const existingMajor = await this.findByCondition({
            name: createMajorDto.name,
            facultyId: createMajorDto.facultyId,
            deleted_at: null
        })
        if (existingMajor && existingMajor.length > 0) {
            throw new BadRequestException(`Chuyên ngành với tên "${createMajorDto.name}" đã tồn tại`)
        }
        return this.create(createMajorDto)
    }
    async getMajorsOfFacultyOwner(facultyId: string, query: PaginationQueryDto): Promise<Paginated<Major>> {
        return await this.majorRepositoryInterface.getMajorsOfFacultyOwner(facultyId, query)
    }
}
