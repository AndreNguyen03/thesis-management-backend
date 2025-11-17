import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator'

import { Type } from 'class-transformer'

export class PaginationQueryDto {
    @IsNotEmpty()
    @IsPositive()
    // Number of entries to return
    limit?: number = 10

    @IsNotEmpty()
    @IsPositive()
    // Number of entries to skip from start
    page?: number = 1

    @IsNotEmpty()
    @IsString()
    //Tìm kiếm với trường nào
    search_by?: string = 'name'

    @IsOptional()
    @IsString()
    //Nội dung
    query?: string

    @IsNotEmpty()
    @IsString()
    //sắp xếp theo trường nào
    //topicTopics cũng đc
    sort_by?: string = 'startTime'

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
