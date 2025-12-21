import { IsNotEmpty, IsNumber, IsOptional, IsPositive, Min } from 'class-validator'
import { Status } from '../schemas/task.schema'

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
