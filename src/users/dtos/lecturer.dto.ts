import { IsArray, IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { AcademicTitle } from '../enums/academic-title'
import { Publication } from '../schemas/lecturer.schema'
import { PartialType } from '@nestjs/mapped-types'
import { Expose, Transform, Type } from 'class-transformer'
import { GetPaginatedObjectDto } from '../../common/pagination-an/dtos/get-pagination-list.dtos'

export class CreateLecturerDto {
    @IsNotEmpty()
    @IsEmail()
    email: string

    @IsNotEmpty()
    @IsString()
    password: string

    @IsNotEmpty()
    @IsEnum(AcademicTitle)
    title: AcademicTitle

    @IsNotEmpty()
    @IsString()
    fullName: string

    @IsNotEmpty()
    @IsBoolean()
    isActive: boolean

    @IsString()
    @IsOptional()
    phone?: string

    @IsNotEmpty()
    @IsString()
    facultyId: string
}

export class ResponseLecturerTableDto {
    id: string
    fullName: string
    email: string
    phone?: string
    facultyName: string
    facultyId: string
    role: string
    isActive: boolean
    createdAt?: Date
}

export class UpdateLecturerProfileDto {
    @IsOptional()
    @IsString()
    fullName?: string

    @IsOptional()
    @IsString()
    email?: string

    @IsOptional()
    @IsString()
    bio?: string

    @IsOptional()
    @IsString()
    phone?: string

    @IsOptional()
    @IsString()
    avatarUrl?: string

    @IsOptional()
    @IsEnum(AcademicTitle)
    title?: AcademicTitle

    @IsOptional()
    @IsString()
    facultyId?: string

    @IsOptional()
    @IsBoolean()
    isActive?: boolean

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    areaInterest?: string[]

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    researchInterests?: string[]

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    supervisedThesisIds?: string[]

    @IsOptional()
    publications?: Publication[]
}

export class UpdateLecturerTableDto {
    @IsOptional()
    @IsString()
    fullName?: string

    @IsOptional()
    @IsString()
    email?: string

    @IsOptional()
    @IsString()
    phone?: string

    @IsOptional()
    @IsString()
    facultyId?: string

    @IsOptional()
    @IsBoolean()
    isActive?: boolean

    @IsOptional()
    @IsEnum(AcademicTitle)
    title?: AcademicTitle
}

export class CreateBatchLecturerDto {
    @IsNotEmpty()
    @IsString()
    fullName: string

    @IsNotEmpty()
    @IsEnum(AcademicTitle)
    title: AcademicTitle

    @IsNotEmpty()
    @IsString()
    facultyName: string

    @IsString()
    @IsOptional()
    phone?: string
}

export class LecturerTableRowDto {
    @Expose()
    id: string

    @Expose()
    fullName: string

    @Expose()
    email: string

    @Expose()
    phone?: string

    @Expose()
    facultyName: string

    @Expose()
    facultyId: string

    @Expose()
    title: string

    @Expose()
    isActive: boolean

    @Expose()
    createdAt?: Date
}

export class ResponseLecturerProfileDto {
    userId: string
    fullName: string
    email: string
    bio?: string
    phone?: string
    avatarUrl?: string
    title: AcademicTitle
    facultyId: string
    facultyName: string
    role: string
    isActive: boolean
    areaInterest?: string[]
    researchInterests?: string[]
    publications?: Publication[]
    supervisedThesisIds?: string[]
    createdAt?: Date
    updatedAt?: Date
}

export class ResponseMiniLecturerDto {
    @Expose()
    _id: string
    @Expose()
    fullName: string
    @Expose()
    email: string
    @Expose()
    phone: string
    @Expose()
    avatarUrl: string
    @Expose()
    avatarName: string

    // @Expose()
    // title: AcademicTitle
    @Expose()
    @Transform(({ value }) => {
        switch (value) {
            case 'Tiến sĩ':
                return 'TS'
            case 'Thạc sĩ':
                return 'ThS'
            default:
                return value
        }
    })
    title: string
    @Expose()
    facultyName: string

    @Expose()
    roleInTopic: string
}
export class PaginatedMiniLecturer extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => ResponseMiniLecturerDto)
    data: ResponseMiniLecturerDto[]
}

export class PaginatedTableLecturer extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => LecturerTableRowDto)
    data: LecturerTableRowDto[]
}
export class ResponseMiniActorDto {
    @Expose()
    _id: string
    @Expose()
    fullName: string
    @Expose()
    avatarUrl: string
    @Expose()
    avatarName: string
}
