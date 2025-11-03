import { PartialType } from '@nestjs/mapped-types'
import { IsNotEmpty, IsString } from 'class-validator'

export class CreateFacultyDto {
    @IsNotEmpty()
    @IsString()
    name: string

    @IsNotEmpty()
    @IsString()
    urlDirection: string

    @IsNotEmpty()
    @IsString()
    email: string
}

export class UpdateFacultyDto extends PartialType(CreateFacultyDto) {}

export class ResponseFacultyDto {
    id: string
    name: string
    urlDirection: string
    email: string
    createdAt?: Date
    updatedAt?: Date
}
