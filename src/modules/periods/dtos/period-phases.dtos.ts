import { IsBoolean, IsDate, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator'
import { PeriodPhaseName } from '../enums/period-phases.enum'
import { ResponseMiniLecturerDto } from '../../../users/dtos/lecturer.dto'
import { Expose, Type } from 'class-transformer'

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
}

export class CreatePhase {
    @IsNotEmpty()
    @IsDate()
    startTime: Date
    @IsNotEmpty()
    @IsDate()
    endTime: Date
}

export class CreatePhaseSubmitTopicDto extends CreatePhase {
    private readonly phase: string = PeriodPhaseName.SUBMIT_TOPIC
    @IsPositive()
    minTopicsPerLecturer: number
    @IsNotEmpty()
    @IsString({ each: true })
    requiredLecturerIds: string[]
    @IsNotEmpty()
    allowManualApproval: boolean = false
}

export class CreateOpenRegPhaseDto extends CreatePhase {
    private readonly phase: string = PeriodPhaseName.OPEN_REGISTRATION
}
export class CreateExecutionPhaseDto extends CreatePhase {
    private readonly phase: string = PeriodPhaseName.EXECUTION
}
export class CreateCompletionPhaseDto extends CreatePhase {
    private readonly phase: string = PeriodPhaseName.COMPLETION
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
