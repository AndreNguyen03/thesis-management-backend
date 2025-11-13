import { PartialType } from '@nestjs/mapped-types'
import { CreateTopicDto } from './create-topic.dto'
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { TopicType } from '../enum/topic-type.enum'
import { TopicStatus } from '../enum'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'

export class PatchTopicDto {
    @IsOptional()
    @IsString()
    title: string

    @IsOptional()
    @IsString()
    description: string

    @IsOptional()
    @IsEnum(TopicType)
    type: TopicType

    @IsOptional()
    majorId: string

    @IsOptional()
    @IsNumber()
    maxStudents: number

    @IsString()
    @IsOptional()
    createBy: string

    @IsOptional()
    @IsEnum(TopicStatus)
    currentStatus: TopicStatus = TopicStatus.Draft // checkbox - nộp luôn hay chưa

    @IsOptional()
    @IsEnum(PeriodPhaseName)
    currentPhase: string

    @IsOptional()
    periodId: string

    @IsOptional()
    @IsArray()
    fieldIds: string[]

    @IsArray()
    @IsOptional()
    requirementIds?: string[] | []

    @IsArray()
    @IsOptional()
    studentIds?: string[] | []

    @IsArray()
    @IsOptional()
    lecturerIds?: string[] | []
}
