import { Inject } from '@nestjs/common'
import { BaseServiceAbstract } from '../../shared/base/service/base.service.abstract'
import { MajorRepositoryInterface } from '../repository/major.repository.interface'
import { Major } from '../schemas/major.schema'
import { CreateMajorDto } from '../dtos/major.dtos'
import { MajorMapper } from '../mappers/major.mapper'

export class MajorService extends BaseServiceAbstract<Major> {
    constructor(
        @Inject('MajorRepositoryInterface')
        private readonly majorRepository: MajorRepositoryInterface
    ) {
        super(majorRepository)
    }

    async createManyMajors(majors: CreateMajorDto[]): Promise<boolean> {
        const entities = MajorMapper.toEntities(majors)
        return this.majorRepository.createMany(entities)
    }
}
