import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEnum,
    IsArray,
    ArrayNotEmpty,
    IsMongoId,
    IsDate,
    IsNumber
} from 'class-validator'
import { Types } from 'mongoose'
import { TopicStatus } from '../enum'

export class CreateTopicDto {
    @IsString()
    @IsNotEmpty()
    title: string

    @IsString()
    @IsNotEmpty()
    description: string

    @IsEnum(['Đồ án', 'Khóa luận', 'NCKH'])
    type: 'Đồ án' | 'Khóa luận' | 'NCKH'

    @IsMongoId()
    departmentId: string

    @IsMongoId()
    majorId: string

    @IsArray()
    @IsString({ each: true })
    @ArrayNotEmpty()
    field: string[]

    @IsArray()
    @IsOptional()
    @IsMongoId({ each: true })
    coAdvisorIds?: string[]

    @IsNumber()
    @IsOptional()
    maxStudents?: number

    @IsDate()
    @IsOptional()
    deadline?: Date
}

export class UpdateTopicDto {
    @IsString()
    @IsOptional()
    title?: string

    @IsString()
    @IsOptional()
    description?: string

    @IsEnum(['Đồ án', 'Khóa luận', 'NCKH'])
    @IsOptional()
    type?: 'Đồ án' | 'Khóa luận' | 'NCKH'

    @IsMongoId()
    @IsOptional()
    departmentId?: string

    @IsMongoId()
    @IsOptional()
    majorId?: string

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    field?: string[]

    @IsArray()
    @IsMongoId({ each: true })
    @IsOptional()
    coAdvisorIds?: string[]

    @IsNumber()
    @IsOptional()
    maxStudents?: number

    @IsDate()
    @IsOptional()
    deadline?: Date

    @IsEnum(TopicStatus)
    @IsOptional()
    status?: TopicStatus
}

export class ResponseTopicDto {
    id: string
    title: string
    description: string
    type: 'Đồ án' | 'Khóa luận' | 'NCKH'
    registrationIds?: string[]
    departmentId: string
    majorId: string
    field: string[]
    coAdvisorIds?: string[]
    maxStudents?: number
    deadline?: Date
    status: TopicStatus
    created_at: Date
    updated_at: Date
}
