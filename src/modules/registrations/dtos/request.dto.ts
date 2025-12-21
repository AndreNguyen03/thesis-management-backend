import { IntersectionType } from '@nestjs/mapped-types'
import { IsOptional } from 'class-validator'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'

export class RequestGetRegistrationHistory {
    @IsOptional()
    periodId?: string
}

export class PaginationStudentGetHistoryQuery extends IntersectionType(
    RequestGetRegistrationHistory,
    PaginationQueryDto
) {}
