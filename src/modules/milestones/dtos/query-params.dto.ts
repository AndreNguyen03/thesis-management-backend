import { IntersectionType } from '@nestjs/mapped-types'
import { IsOptional } from 'class-validator'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'

export class AllDefenseMilestonesQuery {
    @IsOptional()
    year: string
    @IsOptional()
    periodId: string
}
export class PaginationAllDefenseMilestonesQuery extends IntersectionType(
    AllDefenseMilestonesQuery,
    PaginationQueryDto
) {}
