import { IsArray, IsDate, IsEnum, IsNotEmpty, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator'
import { PeriodPhaseName } from '../enums/period-phases.enum'
import { CreatePhaseSubmitTopicDto } from './period-phases'
import { PeriodStatus } from '../enums/periods.enum'
import { Type } from 'class-transformer'
import { Period, PeriodPhases } from '../schemas/period.schemas'
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
    status: PeriodStatus
    @IsOptional()
    @IsArray()
    @ValidateNested()
    phaseSubmitTopic: CreatePhaseSubmitTopicDto
}

export class UpdatePeriodDto extends PartialType(Period) {}

export class GetPeriodDto { 
    name: string
    faculty: GetFacultyDto
    phases: PeriodPhases[]
    status: string
}
