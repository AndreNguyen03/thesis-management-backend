import { PartialType } from '@nestjs/mapped-types'
import { Expose, Type } from 'class-transformer'
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator'
import { GetPaginatedObjectDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'
import { extend } from 'joi'

export class CreateFacultyDto {
    @IsNotEmpty()
    @IsString()
    name: string

    @IsOptional()
    @IsString()
    urlDirection: string

    @IsEmail()
    @IsOptional()
    email: string
}
export class CreateFacultyListDto {
    @IsNotEmpty({ each: true })
    @IsArray()
    @Type(() => CreateFacultyDto)
    @ValidateNested({ each: true })
    faculties: CreateFacultyDto[]
}


export class UpdateFacultyDto extends PartialType(CreateFacultyDto) {}

export class GetFacultyDto {
    @Expose()
    _id: string
    @Expose()
    name: string
    @Expose()
    email: string
    @Expose()
    urlDirection: string
}

export class GetPaginatedFacultyDto extends GetPaginatedObjectDto{
    @Expose()
    @Type(() => GetFacultyDto)
    data: GetFacultyDto[]
}
