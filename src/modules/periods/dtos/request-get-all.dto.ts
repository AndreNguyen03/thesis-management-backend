import { IntersectionType } from '@nestjs/swagger'
import { IsDate, IsDateString, IsOptional } from 'class-validator'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'

export class GetPeriodsBasseDto {
   
}
export class RequestGetPeriodsDto extends IntersectionType(GetPeriodsBasseDto, PaginationQueryDto) {}
