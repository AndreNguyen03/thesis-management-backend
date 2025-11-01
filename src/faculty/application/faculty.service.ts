import { Inject } from '@nestjs/common'
import { BaseServiceAbstract } from '../../shared/base/service/base.service.abstract'
import { FacultyRepositoryInterface } from '../repository/faculty.repository.interface'
import { Faculty } from '../schemas/faculty.schema'
import { CreateFacultyDto } from '../dtos/faculty.dtos'

export class FacultyService extends BaseServiceAbstract<Faculty> {
    constructor(
        @Inject('FacultyRepositoryInterface')
        private readonly facultyRepository: FacultyRepositoryInterface
    ) {
        super(facultyRepository)
    }

    async createManyFacultys(facultys: CreateFacultyDto[]): Promise<boolean> {
        return this.facultyRepository.createMany(facultys)
    }
}
