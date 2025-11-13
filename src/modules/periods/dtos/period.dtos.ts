import {
    IsArray,
    IsDate,
    IsEmpty,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsPositive,
    IsString,
    ValidateNested
} from 'class-validator'
import { PeriodPhaseName } from '../enums/period-phases.enum'
import { CreatePhaseSubmitTopicDto } from './period-phases.dtos'
import { PeriodStatus } from '../enums/periods.enum'
import { Expose, Type } from 'class-transformer'
import { Period, PeriodPhase, } from '../schemas/period.schemas'
import { PartialType } from '@nestjs/swagger'
import mongoose from 'mongoose'
import { GetFacultyDto } from '../../faculties/dtos/faculty.dtos'

export class CreatePeriodDto {
    @IsNotEmpty()
    name: string
    @IsNotEmpty()
    facultyId: string
    @IsNotEmpty()
    @IsEnum(PeriodStatus)
    status: PeriodStatus = PeriodStatus.OnGoing
    @IsOptional()
    @IsArray()
    @ValidateNested()
    phaseSubmitTopic: CreatePhaseSubmitTopicDto
}

export class UpdatePeriodDto {
    @IsNotEmpty()
    @IsString()
    name: string
}

export class GetPeriodDto {
    @Expose()
    name: string
    @Expose()
    @Type(() => GetFacultyDto)
    faculty: GetFacultyDto
    @Expose()
    @Type(() => PeriodPhase)
    phases: PeriodPhase[]
    @Expose()
    status: string
}
