import { IsBoolean, IsDate, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator'
import { PeriodPhaseName, PeriodPhaseStatus } from '../enums/period-phases.enum'
import { ResponseMiniLecturerDto } from '../../../users/dtos/lecturer.dto'
import { Expose, Type } from 'class-transformer'
import mongoose from 'mongoose'
import { PeriodStatus } from '../enums/periods.enum'

export class GetPeriodPhaseDto {
    @Expose()
    _id: string
    @Expose()
    phase: string
    @Expose()
    startTime: Date
    @Expose()
    endTime: Date
    @Expose()
    minTopicsPerLecturer: number
    @Expose()
    @Type(() => ResponseMiniLecturerDto)
    @Expose()
    requiredLecturers: ResponseMiniLecturerDto[]
    @Expose()
    allowManualApproval: boolean
    // external fields
    @Expose()
    status: PeriodPhaseStatus
}

export class CreatePhase {
    @IsNotEmpty()
    @IsDate()
    startTime: Date
    @IsNotEmpty()
    @IsDate()
    endTime: Date
}

export class ConfigPhaseSubmitTopicDto extends CreatePhase {
    @IsNotEmpty()
    readonly phase: string = PeriodPhaseName.SUBMIT_TOPIC
    @IsNotEmpty()
    @IsPositive()
    minTopicsPerLecturer: number
    @IsNotEmpty()
    @IsString({ each: true })
    requiredLecturerIds: string[]
    @IsNotEmpty()
    allowManualApproval: boolean = false
    @IsNotEmpty()
    readonly _id: string = new mongoose.Types.ObjectId().toHexString()
}

export class ConfigOpenRegPhaseDto extends CreatePhase {
    @IsNotEmpty()
    readonly phase: string = PeriodPhaseName.OPEN_REGISTRATION
}
export class ConfigExecutionPhaseDto extends CreatePhase {
    @IsNotEmpty()
    readonly phase: string = PeriodPhaseName.EXECUTION
}
export class ConfigCompletionPhaseDto extends CreatePhase {
    @IsNotEmpty()
    readonly phase: string = PeriodPhaseName.COMPLETION
}
export class UpdatePeriodPhaseDto {
    @IsOptional()
    @IsDate()
    startTime: Date
    @IsOptional()
    @IsDate()
    endTime: Date
    @IsOptional()
    @IsPositive()
    minTopicsPerLecturer: number
    @IsOptional()
    @IsString({ each: true })
    requiredLecturerIds: string[]
    @IsOptional()
    @IsBoolean()
    allowManualApproval: boolean
}

