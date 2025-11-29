import { PartialType } from '@nestjs/mapped-types'
import { CreateTopicDto } from './create-topic.dto'
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { TopicType } from '../enum/topic-type.enum'
import { TopicStatus } from '../enum'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'

export class PatchTopicDto {
    @IsOptional()
    @IsString()
    titleVN: string

    @IsOptional()
    @IsString()
    titleEng: string

    @IsOptional()
    @IsString()
    description: string

    @IsOptional()
    majorId: string

    @IsOptional()
    @IsNumber()
    maxStudents: number

    @IsOptional()
    @IsArray()
    fieldIds: string[]

    @IsArray()
    @IsOptional()
    requirementIds?: string[] | []
    @IsOptional()
    type: string
}
