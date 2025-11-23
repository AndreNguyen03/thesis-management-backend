import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { CreateRequirementDto } from '../dtos/create-requirement.dto'
import { Requirement } from '../schemas/requirement.schemas'

export interface IRequirementsRepository extends BaseRepositoryInterface<Requirement> {
    createRequirement(createFieldDto: CreateRequirementDto): Promise<Requirement>
    getAllRequirements(query: PaginationQueryDto): Promise<Paginated<Requirement>>
    createManyRequirement(createRequirementDto: CreateRequirementDto[]): Promise<Requirement[]>
}
