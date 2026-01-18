import { IsArray, IsMongoId, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator'
import { Type } from 'class-transformer'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'

export class BulkArchiveTopicsDto {
    @IsArray()
    @IsNotEmpty()
    @IsMongoId({ each: true })
    topicIds: string[]
}

export class GetTopicsForArchiveQuery extends PaginationQueryDto {
 

    @IsOptional()
    @IsString()
    status?: 'all' | 'graded' | 'assigned' | 'archived' | 'locked'
}
