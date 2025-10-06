import { IsNotEmpty, IsString } from 'class-validator'
import { ThesisStatus } from '../enum/thesis-status.enum'
import { IsOptional, IsNumber, IsDate, IsArray, IsEnum } from 'class-validator'
import mongoose from 'mongoose'
export class CreateThesisDto {
    @IsNotEmpty()
    @IsString()
    title: string

    @IsNotEmpty()
    @IsString()
    description: string

    @IsOptional()
    @IsString({ each: true })
    lecturerIds: mongoose.Schema.Types.ObjectId[]

    @IsString()
    department?: string

    @IsOptional()
    @IsString()
    field?: string

    @IsNumber()
    maxStudents?: number

    @IsNumber()
    registerdStudents?: number = 0

    @IsOptional()
    @IsDate()
    deadline?: Date

    @IsArray()
    @IsString({ each: true })
    requirements?: string[]

    @IsOptional()
    @IsEnum(ThesisStatus)
    status?: ThesisStatus

    @IsOptional()
    @IsNumber()
    rating?: number

    @IsOptional()
    @IsNumber()
    views?: number
}
