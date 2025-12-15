import { IsNotEmpty, IsNumber, IsPositive, Min } from 'class-validator'

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
