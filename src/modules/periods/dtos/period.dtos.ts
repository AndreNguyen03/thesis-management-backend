import {
    IsArray,
    IsDate,
    IsEmpty,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    Min,
    ValidateNested
} from 'class-validator'
import { PeriodPhaseName } from '../enums/period-phases.enum'
import { CreatePhaseSubmitTopicDto, GetPeriodPhaseDto } from './period-phases.dtos'
import { PeriodStatus } from '../enums/periods.enum'
import { Expose, Type } from 'class-transformer'
import { Period, PeriodPhase } from '../schemas/period.schemas'
import { PartialType } from '@nestjs/swagger'
import mongoose from 'mongoose'
import { GetFacultyDto } from '../../faculties/dtos/faculty.dtos'
import { GetPaginatedObjectDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'

export class CreatePeriodDto {
    @IsNotEmpty()
    name: string
    @IsNotEmpty()
    @IsEnum(PeriodStatus)
    status: PeriodStatus = PeriodStatus.OnGoing
    @IsOptional()
    @IsArray()
    @ValidateNested()
    phaseSubmitTopic: CreatePhaseSubmitTopicDto
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    totalTopics: number = 0
    @IsNotEmpty()
    @IsDate()
    startTime: Date = new Date()
    @IsNotEmpty()
    @IsDate()
    endTime: Date
}

export class UpdatePeriodDto {
    @IsNotEmpty()
    @IsString()
    name: string
}

export class GetPeriodDto {
    @Expose()
    _id: string
    @Expose()
    name: string
    @Expose()
    @Type(() => GetFacultyDto)
    faculty: GetFacultyDto
    // @Expose()
    // @Type(() => PeriodPhase)
    // phases: PeriodPhase[]
    @Expose()
    status: string

    @Expose()
    startTime: Date
    @Expose()
    endTime: Date
    // @Expose()
    // totalTopics: number
    @Expose()
    currentPhaseDetail: GetPeriodPhaseDto | null
}

export class GetPaginatedPeriodDto extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => GetPeriodDto)
    data: GetPeriodDto[]
}
