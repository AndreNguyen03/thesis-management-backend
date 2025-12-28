import { Inject, Injectable } from '@nestjs/common'
import { IRequirementsRepository } from '../repository/requirements.repository.interface'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { Requirement } from '../schemas/requirement.schemas'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'

@Injectable()
export class RequirementsService {
    constructor(
        @Inject('IRequirementsRepository')
        private readonly requirementRepo: IRequirementsRepository
    ) {}

    async getAllRequirements(query: PaginationQueryDto): Promise<Paginated<Requirement>> {
        return this.requirementRepo.getAllRequirements(query)
    }
}
