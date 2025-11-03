import { IsOptional, IsPositive, IsString, IsIn } from 'class-validator'

export class PaginationQueryDto {
    @IsOptional()
    @IsPositive()
    page: number = 1 

    @IsOptional()
    @IsPositive()
    page_size: number = 10 

    @IsOptional()
    @IsString()
    search_by?: string 

    @IsOptional()
    @IsString()
    query?: string 

    @IsOptional()
    @IsString()
    sort_by?: string 

    @IsOptional()
    @IsIn(['asc', 'desc'])
    sort_order?: 'asc' | 'desc' 
}
