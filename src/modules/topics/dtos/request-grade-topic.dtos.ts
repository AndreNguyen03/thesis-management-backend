import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator"

export class RequestGradeTopicDto {
    @IsNumber()
    @Min(0)
    @Max(10)
    score: number
    @IsString()
    @IsOptional()
    note?: string
}