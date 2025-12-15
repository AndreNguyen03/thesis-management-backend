import { IsNotEmpty, IsOptional, ValidateNested } from 'class-validator'
import { TaskColumn } from '../schemas/task.schema'

export class RequestGetTaskQuery {
    @IsNotEmpty()
    groupId: string
}

export class SubtaskDto {
    @IsNotEmpty()
    title: string // VD: "Nghiên cứu UI/UX"
    @IsNotEmpty()
    isCompleted: boolean
}

export class TaskColumnDto {
    @IsNotEmpty()
    title: string // VD: "Todo", "In Progress", "Done"
    @IsNotEmpty()
    color: string // Màu nền cột
    @IsNotEmpty()
    @ValidateNested({ each: true })
    items: SubtaskDto[]
}


