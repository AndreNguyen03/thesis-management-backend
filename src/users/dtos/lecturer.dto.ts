import { IsArray, IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { AcademicTitle } from '../enums/academic-title'
import { Publication } from '../schemas/lecturer.schema'
import { PartialType } from '@nestjs/mapped-types'
import { Expose, Type } from 'class-transformer'

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

export class LecturerTableRowDto {
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

export class ResponseLecturerProfileDto {
    userId: string
    fullName: string
    email: string
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

export class MiniLecturerInforDto {
    @Expose()
    title: string
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
    @Type(() => MiniLecturerInforDto)
    lecturerInfo: MiniLecturerInforDto
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
