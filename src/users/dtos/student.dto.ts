import { IsArray, IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { PartialType } from '@nestjs/mapped-types'
import { CreateUserDto } from './create-user.dto'
import { Expose, Type } from 'class-transformer'
import { GetPaginatedObjectDto } from '../../common/pagination-an/dtos/get-pagination-list.dtos'
import { RegistrationDto } from '../../modules/topics/dtos/registration/get-students-in-topic'

// DTO dùng để tạo mới sinh viên
export class CreateStudentDto extends CreateUserDto {
    @IsNotEmpty()
    @IsString()
    facultyId: string

    @IsNotEmpty()
    @IsString()
    studentCode: string

    @IsNotEmpty()
    @IsString()
    class: string

    @IsNotEmpty()
    @IsString()
    major: string
}

// DTO trả về bảng sinh viên
export class ResponseStudentTableDto {
    id: string
    studentCode: string
    fullName: string
    email: string
    phone?: string
    class: string
    major: string
    facultyId: string
    facultyName: string
    role: string
    isActive: boolean
    createdAt?: Date
}

export class ResponseMiniStudentDto {
    @Expose()
    _id: string

    @Expose()
    fullName: string
    @Expose()
    email: string
    @Expose()
    phone: string
    @Expose()
    avatarUrl?: string
    @Expose()
    avatarName?: string
    @Expose()
    studentCode: string
    @Expose()
    major: string
    @Expose()
    facultyName: string
}

export class RelatedStudentInTopic {
    @Expose()
    @Type(() => RegistrationDto)
    approvedStudents: RegistrationDto[]
    @Expose()
    @Type(() => RegistrationDto)
    pendingStudents: RegistrationDto[]
}

// DTO cập nhật profile sinh viên (dùng cho self-update)
export class UpdateStudentProfileDto {
    @IsOptional()
    @IsString()
    fullName?: string

    @IsOptional()
    @IsString()
    email?: string
    
    @IsOptional()
    @IsString()
    bio? : string

    @IsOptional()
    @IsString()
    phone?: string

    @IsOptional()
    @IsString()
    avatarUrl?: string

    @IsOptional()
    @IsString()
    facultyId?: string

    @IsOptional()
    @IsBoolean()
    isActive?: boolean

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    skills?: string[]

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    interests?: string[]
}

// DTO cập nhật bảng sinh viên (dùng cho admin)
export class UpdateStudentTableDto {
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
    @IsString()
    studentCode?: string

    @IsOptional()
    @IsString()
    class?: string

    @IsOptional()
    @IsString()
    major?: string
}

// DTO cho hàng trong bảng quản lý
export class StudentTableRowDto {
    id: string
    studentCode: string
    fullName: string
    email: string
    phone?: string
    class: string
    major: string
    faculty: string
    role: string
    isActive: boolean
    createdAt?: Date
}

// DTO trả về profile chi tiết sinh viên
export class ResponseStudentProfileDto {
    userId: string
    fullName: string
    email: string
    phone?: string
    avatarUrl?: string
    facultyId: string
    facultyName: string
    role: string
    isActive: boolean
    skills?: string[]
    interests?: string[]
    studentCode: string
    class: string
    major: string
    createdAt?: Date
    updatedAt?: Date
}

export class ResponseMiniStudent {
    @Expose()
    _id: string
    @Expose()
    fullName: string
    @Expose()
    email: string
    @Expose()
    phone?: string
    @Expose()
    studentCode: string
    @Expose()
    major: string
    @Expose()
    avatarUrl?: string
}
export class PaginatedMiniStudent extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => ResponseMiniStudent)
    data: ResponseMiniStudent[]
}
