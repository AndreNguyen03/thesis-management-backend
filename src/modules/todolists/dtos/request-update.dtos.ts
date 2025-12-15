import { IsNotEmpty, IsOptional, ValidateNested } from 'class-validator'
import { TaskColumnDto } from './request-get.dto'

export class RequestCreate {
    @IsNotEmpty()
    groupId: string

    @IsNotEmpty()
    title: string

    @IsOptional()
    description: string
}
export class UpdateTaskColumn {
    @IsNotEmpty()
    @ValidateNested({ each: true })
    columns: TaskColumnDto[]
}

export class RequestUpdate {
    @IsOptional()
    title: string

    @IsOptional()
    description: string
}
