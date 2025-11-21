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
    major: string

    @IsOptional()
    @IsNumber()
    maxStudents: number

    @IsOptional()
    @IsEnum(TopicStatus)
    currentStatus: TopicStatus

    @IsOptional()
    @IsEnum(PeriodPhaseName)
    currentPhase: string

    @IsOptional()
    @IsArray()
    fields: string[]

    @IsArray()
    @IsOptional()
    requirements?: string[] | []

    // @IsArray()
    // @IsOptional()
    // studentIds?: string[] | []

    // @IsArray()
    // @IsOptional()
    // lecturerIds?: string[] | []
}
