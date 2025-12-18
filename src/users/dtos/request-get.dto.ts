import { IntersectionType } from '@nestjs/mapped-types'
import { PaginationQueryDto } from '../../common/pagination-an/dtos/pagination-query.dto'
import { IsBoolean, IsIn, IsOptional, IsString, ValidateIf } from 'class-validator'
import { Transform } from 'class-transformer'

export class RequestGetLecturerDto extends PaginationQueryDto {
    @IsOptional()
    @IsString()
    title?: string
    @IsOptional()
    @ValidateIf((_, value) => value !== 'all')
    @Transform(({ value }) => {
        if (value === 'all') return 'all'
        if (value === 'true' || value === true) return true
        if (value === 'false' || value === false) return false
        return value
    })
    isActive?: boolean | 'all'
    @IsOptional()
    @IsString()
    facultyId?: string
}



export class RequestGetStudentDto extends PaginationQueryDto {
    @IsOptional()
    @IsString()
    major?: string
    @IsOptional()
    @ValidateIf((_, value) => value !== 'all')
    @Transform(({ value }) => {
        if (value === 'all') return 'all'
        if (value === 'true' || value === true) return true
        if (value === 'false' || value === false) return false
        return value
    })
    isActive?: boolean | 'all'
    @IsOptional()
    @IsString()
    facultyId?: string
}
