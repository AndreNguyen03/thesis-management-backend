import { IsDate, IsOptional } from 'class-validator'
import { IntersectionType } from '@nestjs/swagger'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'

export class GetKnowledgeSourceDto {
    @IsDate()
    @IsOptional()
    startDate?: Date

    @IsDate()
    @IsOptional()
    endDate?: Date
}
export class RequestKnowledgeSourceDto extends IntersectionType(GetKnowledgeSourceDto, PaginationQueryDto) {}
