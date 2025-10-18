import { IsNotEmpty, IsString } from 'class-validator'
import { TopicStatus } from '../enum/topic-status.enum'
import { IsOptional, IsNumber, IsDate, IsArray, IsEnum } from 'class-validator'
import mongoose from 'mongoose'
export class CreateTopicDto {
    @IsNotEmpty()
    @IsString()
    title: string

    @IsNotEmpty()
    @IsString()
    description: string

    @IsOptional()
    @IsString({ each: true })
    lecturerIds: string[]

    @IsString()
    department?: string

    @IsOptional()
    @IsString({ each: true })
    studentIds?: mongoose.Schema.Types.ObjectId[]

    @IsOptional()
    @IsString({ each: true })
    registrationIds?: mongoose.Schema.Types.ObjectId[]

    @IsOptional()
    @IsString()
    field?: string

    @IsNumber()
    maxStudents?: number

    @IsNumber()
    registeredStudents?: number = 0

    @IsOptional()
    @IsDate()
    deadline?: Date

    @IsArray()
    @IsString({ each: true })
    requirements?: string[]

    @IsOptional()
    @IsEnum(TopicStatus)
    status?: TopicStatus
}
