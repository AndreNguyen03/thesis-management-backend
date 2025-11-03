import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { CreateRequirementDto } from '../dtos/create-requirement.dto'
import { Requirement } from '../schemas/requirement.schemas'

export interface IRequirementsRepository extends BaseRepositoryInterface<Requirement> {
    createRequirement(createFieldDto: CreateRequirementDto): Promise<Requirement>
    getAllRequirements(): Promise<Requirement[]>
    createManyRequirement(createRequirementDto: CreateRequirementDto[]): Promise<Requirement[]>
}
