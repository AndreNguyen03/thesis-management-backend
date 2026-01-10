import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    Min,
    IsString,
    IsArray,
    IsEnum,
    IsDateString
} from 'class-validator'
import { Status, TaskPriority } from '../schemas/task.schema'

export class UpdateSubtaskDto {
    @IsOptional()
    @IsString()
    title?: string

    @IsOptional()
    @IsString()
    description?: string

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    assignees?: string[]

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
    @IsString()
    reporter?: string | null
}

export class MoveInColumnQuery {
    @IsNotEmpty()
    @Min(0)
    newPos: number
    @IsNotEmpty()
    @Min(0)
    oldPos: number
}

export class MoveToColumnQuery {
    @IsNotEmpty()
    subTaskId: string
    @IsNotEmpty()
    oldColumnId: string
    @IsNotEmpty()
    newColumnId: string
    @IsNotEmpty()
    @Min(0)
    newPos: number
}
export class UpdateStatus {
    @IsNotEmpty()
    status: Status
}

export class UpdateTaskMilestoneDto {
    @IsOptional()
    milestoneId: string | null
}
