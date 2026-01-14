import { IsEmail, IsString, IsBoolean } from 'class-validator'
import { PartialType } from '@nestjs/mapped-types'
import { Expose, Transform } from 'class-transformer'
import { Admin } from '../schemas/admin.schema'

// Tạo tài khoản Admin
export class CreateAdminDto {
    @IsString()
    fullName: string

    @IsEmail()
    email: string

    @IsString()
    password: string

    readonly role: 'admin' = 'admin'
}

export class UpdateAdminDto extends PartialType(CreateAdminDto) {
    @IsBoolean()
    isActive?: boolean
}

export class AdminResponseDto {
    @Expose()
    @Transform(({ obj }) => obj._id?.toString())
    _id: string
    @Expose()
    fullName: string
    @Expose()
    email: string
    @Expose()
    isActive: boolean
    @Expose()
    role: 'admin'
}
