import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString } from 'class-validator'
import { UserRole } from '../../auth/enum/user-role.enum'
import { CreateUserDto } from './create-user.dto'

export class CreateFacultyBoardDto extends CreateUserDto {
    @IsNotEmpty()
    @IsString()
    facultyId: string
}

export class UpdateFacultyBoardTableDto {
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
}

export class UpdateFacultyBoardProfileDto {
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
    @IsString()
    facultyId?: string

    @IsOptional()
    @IsBoolean()
    isActive?: boolean
}


export class ResponseFacultyBoardTableDto {
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

export class ResponseFacultyBoardProfileDto {
    userId: string
    fullName: string
    email: string
    phone?: string
    avatarUrl?: string
    facultyId: string
    facultyName: string
    role: string
    isActive: boolean
    createdAt?: Date
    updatedAt?: Date
}
