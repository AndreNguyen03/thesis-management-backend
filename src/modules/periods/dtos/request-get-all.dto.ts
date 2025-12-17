import { IntersectionType } from '@nestjs/swagger'
import { IsDate, IsDateString, IsEmpty, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { PeriodStatus, PeriodType } from '../enums/periods.enum'

export class GetPeriodsBasseDto {}
export class RequestGetPeriodsDto extends IntersectionType(GetPeriodsBasseDto, PaginationQueryDto) {
    @IsOptional()
    @IsEnum(PeriodType)
    type?: PeriodType
    @IsOptional()
    status?: string
    @IsOptional()
    role?: string
}


