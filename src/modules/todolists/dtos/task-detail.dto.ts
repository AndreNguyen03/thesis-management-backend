import {
    IsArray,
    IsDateString,
    IsEnum,
    IsMongoId,
    IsOptional,
    IsString,
    MaxLength,
    IsNumber,
    ValidateNested
} from 'class-validator'
import { TaskPriority } from '../schemas/task.schema'
import { Type } from 'class-transformer'

export class FileInfoDto {
    @IsString()
    name: string

    @IsString()
    url: string

    @IsNumber()
    size: number
}

// DTO để thêm comment
export class AddCommentDto {
    @IsString()
    @MaxLength(5000)
    content: string

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FileInfoDto)
    files?: FileInfoDto[] // File info với name, url, size
}

// DTO để cập nhật comment
export class UpdateCommentDto {
    @IsString()
    @MaxLength(5000)
    content: string

    @IsOptional()
    @IsArray()
    existingFiles?: FileInfoDto[]
}

// DTO để assign/unassign users
export class AssignUsersDto {
    @IsArray()
    @IsMongoId({ each: true })
    userIds: string[]
}

// DTO để cập nhật description
export class UpdateDescriptionDto {
    @IsString()
    description: string
}

// DTO để cập nhật priority
export class UpdatePriorityDto {
    @IsEnum(TaskPriority)
    priority: TaskPriority
}

// DTO để cập nhật labels
export class UpdateLabelsDto {
    @IsArray()
    @IsString({ each: true })
    labels: string[]
}

// DTO để cập nhật due date
export class UpdateDueDateDto {
    @IsOptional()
    @IsDateString()
    dueDate: string | null
}

// DTO để cập nhật thông tin task (combined)
export class UpdateTaskDetailDto {
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string

    @IsOptional()
    @IsString()
    description?: string

    @IsOptional()
    @IsEnum(TaskPriority)
    priority?: TaskPriority

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    labels?: string[]

    @IsOptional()
    @IsDateString()
    dueDate?: string | null

    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    assignees?: string[]
}
