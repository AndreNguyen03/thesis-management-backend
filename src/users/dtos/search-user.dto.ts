// dtos/search-user.dto.ts
import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString, IsInt, Min } from 'class-validator'

export class SearchUserQueryDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    query?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsInt()
    @Min(1)
    page?: number = 1

    @ApiProperty({ required: false })
    @IsOptional()
    @IsInt()
    @Min(1)
    limit?: number = 10
}

export class SearchUserItemDto {
    id: string
    fullName: string
    email: string
    role: string
    studentCode?: string
    title?: string
    avatarUrl?: string
}

export class PaginatedSearchUserDto {
    data: SearchUserItemDto[]
    meta: {
        itemsPerPage: number
        totalItems: number
        currentPage: number
        totalPages: number
    }
}
