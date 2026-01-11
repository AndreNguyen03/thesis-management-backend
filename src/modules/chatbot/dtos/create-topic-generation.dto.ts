import { IsString, IsOptional, IsNumber, Min, IsArray } from 'class-validator'
import { Type } from 'class-transformer'

export class GenerateTopicDto {
    @IsString()
    prompt: string

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number
}

export class ApplyGeneratedTopicDto {
    @IsArray()
    @IsString({ each: true })
    missingFields: string[]

    @IsArray()
    @IsString({ each: true })
    missingRequirements: string[]
}
