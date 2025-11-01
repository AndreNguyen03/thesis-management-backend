import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEnum,
    IsArray,
    ArrayNotEmpty,
    IsMongoId,
    IsDate,
    IsNumber,
} from 'class-validator'
import { Types } from 'mongoose'
import { TopicStatus } from '../enum'

// Liệt kê các loại đề tài hợp lệ
export enum TopicType {
    DO_AN = 'Đồ án',
    KHOA_LUAN = 'Khóa luận',
    NCKH = 'NCKH',
}

/**
 * DTO tạo mới Topic
 */
export class CreateTopicDto {
    @IsString()
    @IsNotEmpty()
    title: string

    @IsString()
    @IsNotEmpty()
    description: string

    @IsEnum(TopicType)
    type: TopicType

    @IsMongoId()
    departmentId: string

    @IsMongoId()
    majorId: string

    @IsArray()
    @IsMongoId({ each: true })
    @ArrayNotEmpty()
    fieldIds: string[]

    @IsArray()
    @IsOptional()
    @IsMongoId({ each: true })
    coAdvisorIds?: string[]

    @IsArray()
    @IsOptional()
    @IsMongoId({ each: true })
    studentIds?: string[]

    @IsArray()
    @IsOptional()
    @IsMongoId({ each: true })
    fileIds?: string[]

    @IsNumber()
    @IsOptional()
    maxStudents?: number

    @IsDate()
    @IsOptional()
    deadline?: Date
}

/**
 * DTO cập nhật Topic
 */
export class UpdateTopicDto {
    @IsString()
    @IsOptional()
    title?: string

    @IsString()
    @IsOptional()
    description?: string

    @IsEnum(TopicType)
    @IsOptional()
    type?: TopicType

    @IsMongoId()
    @IsOptional()
    departmentId?: string

    @IsMongoId()
    @IsOptional()
    majorId?: string

    @IsArray()
    @IsMongoId({ each: true })
    @IsOptional()
    fieldIds?: string[]

    @IsArray()
    @IsMongoId({ each: true })
    @IsOptional()
    coAdvisorIds?: string[]

    @IsArray()
    @IsMongoId({ each: true })
    @IsOptional()
    studentIds?: string[]

    @IsArray()
    @IsMongoId({ each: true })
    @IsOptional()
    fileIds?: string[]

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

/**
 * DTO phản hồi cho client
 */
export class ResponseTopicDto {
    id: string
    title: string
    description: string
    type: TopicType
    registrationIds?: string[]
    departmentId: string
    majorId: string
    fieldIds: string[]
    coAdvisorIds?: string[]
    studentIds?: string[]
    fileIds?: string[]
    maxStudents?: number
    deadline?: Date
    status: TopicStatus
    created_at: Date
    updated_at: Date
}
