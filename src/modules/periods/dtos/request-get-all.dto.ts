import { IntersectionType } from '@nestjs/swagger'
import { IsDate, IsOptional } from 'class-validator'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'

export class GetPeriodsBasseDto {
    @IsDate()
    @IsOptional()
    startDate?: Date

    @IsDate()
    @IsOptional()
    endDate?: Date
}
export class RequestGetPeriodsDto extends IntersectionType(GetPeriodsBasseDto, PaginationQueryDto) {}
