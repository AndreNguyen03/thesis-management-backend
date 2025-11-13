import { IsArray, IsDate, IsNotEmpty, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator'
import { PeriodPhaseName } from '../enums/period-phases.enum'

class CreatePhaseSubmitTopicDto {
    private readonly phase: string = PeriodPhaseName.SUBMIT_TOPIC
    @IsNotEmpty()
    @IsDate()
    startTime: Date
    @IsNotEmpty()
    @IsDate()
    endTime: Date
    @IsPositive()
    minTopicsPerLecturer: number
    @IsNotEmpty()
    @IsString({ each: true })
    requiredLecturerIds: string[]
    @IsNotEmpty()
    allowManualApproval: boolean
}
export class CreatePeriodDto {
    @IsNotEmpty()
    name: string
    @IsNotEmpty()
    facultyId: string
    @IsNotEmpty()
    status: string
    @IsOptional()
    @IsArray()
    @ValidateNested()
    phaseSubmitTopic: CreatePhaseSubmitTopicDto
}
