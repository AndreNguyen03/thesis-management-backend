import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Requirement } from '../../schemas/requirement.schemas'
import { IRequirementsRepository } from '../requirements.repository.interface'
import { Model } from 'mongoose'
import { CreateFieldDto } from '../../../fields/dtos/create-field.dto'
import { CreateRequirementDto } from '../../dtos/create-requirement.dto'
import { BadRequestException } from '@nestjs/common'
import { PaginationQueryDto } from '../../../../common/pagination-an/dtos/pagination-query.dto'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'

export class RequirementsRepository extends BaseRepositoryAbstract<Requirement> implements IRequirementsRepository {
    constructor(
        @InjectModel(Requirement.name) private readonly requirementModel: Model<Requirement>,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(requirementModel)
    }
    async createManyRequirement(createRequirementDto: CreateRequirementDto[]): Promise<Requirement[]> {
        const createdRequirements = await this.requirementModel.insertMany(createRequirementDto)
        return createdRequirements
    }
    async createRequirement(createRequirementDto: CreateRequirementDto): Promise<Requirement> {
        const existingRequirement = await this.requirementModel.findOne({
            slug: createRequirementDto.slug,
            deleted_at: null
        })
        if (existingRequirement) {
            throw new BadRequestException('Yêu cầu đã tồn tại')
        }
        const createdRequirement = await this.requirementModel.create(createRequirementDto)
        return createdRequirement.save()
    }

    async getAllRequirements(query: PaginationQueryDto): Promise<Paginated<Requirement>> {
       return await this.paginationProvider.paginateQuery<Requirement>(query, this.requirementModel)
    }
}
