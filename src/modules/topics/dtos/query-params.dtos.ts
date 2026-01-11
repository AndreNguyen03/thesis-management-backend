import { IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'

export class SubmittedTopicParamsDto extends PaginationQueryDto {
    @IsOptional()
    @IsString()
    periodId: string
}

export class PaginationRegisteredTopicsQueryParams extends PaginationQueryDto {
    @IsOptional()
    @IsString()
    periodId: string
}
export class PaginationDraftTopicsQueryParams extends PaginationQueryDto {
    @IsOptional()
    @IsString()
    periodId: string
}
