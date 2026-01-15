import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class MatchLecturerRequestDto {
    @IsString()
    query: string

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(50)
    @Type(() => Number)
    limit?: number = 10
}
