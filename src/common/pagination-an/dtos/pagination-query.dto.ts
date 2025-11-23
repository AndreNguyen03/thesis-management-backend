import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsPositive, IsString, Min } from 'class-validator'

import { Type } from 'class-transformer'

export class PaginationQueryDto {
    @IsNotEmpty()
    @Min(0)
    // Number of entries to return
    limit?: number = 10

    @IsNotEmpty()
    @IsPositive()
    // Number of entries to skip from start
    page?: number = 1

    @IsOptional()
    @IsString()
    //Tìm kiếm với trường nào
    search_by?: string

    @IsOptional()
    @IsString()
    //Nội dung
    query?: string

    @IsOptional()
    @IsString()
    //Lọc với theo trường nào đó
    //Nội dung
    filter_by?: string

    @IsOptional()
    @IsString()
    //Lọc với giá trị của trường "filert_by"
    //Nội dung
    filter?: string

    @IsOptional()
    @IsString()
    //sắp xếp theo trường nào
    //topicTopics cũng đc
    sort_by?: string = 'createdAt'

    @IsNotEmpty()
    @IsString()
    @IsEnum(['asc', 'desc'])
    //trình tự sắp xếp
    sort_order?: string = 'desc'

    //Tìm kiếm xem createAt nằm trong khoảng nào
    @IsOptional()
    @IsDateString()
    startDate?: string

    @IsOptional()
    @IsDateString()
    endDate?: string
}
