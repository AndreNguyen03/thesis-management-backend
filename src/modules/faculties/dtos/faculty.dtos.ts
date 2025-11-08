import { PartialType } from '@nestjs/mapped-types'
import { Expose, Type } from 'class-transformer'
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator'
import { LinkDto, MetaDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'

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
    name: string
    @Expose()
    email: string
    @Expose()
    urlDirection: string
}

export class GetPaginatedFacultyDto {
    @Expose()
    @Type(() => GetFacultyDto)
    data: GetFacultyDto[]
    @Expose()
    @Type(() => MetaDto)
    meta: MetaDto
    @Expose()
    @Type(() => LinkDto)
    links: LinkDto
}
