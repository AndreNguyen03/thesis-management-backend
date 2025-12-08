import { IntersectionType } from '@nestjs/swagger'
import { IsDate, IsDateString, IsEmpty, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { PeriodType } from '../enums/periods.enum'

export class GetPeriodsBasseDto {
   
}
export class RequestGetPeriodsDto extends IntersectionType(GetPeriodsBasseDto, PaginationQueryDto) {}

export class GetCurrentPeriodRequest {
    @IsNotEmpty()
    @IsString()
    periodType: PeriodType
}