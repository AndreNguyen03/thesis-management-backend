import { IsBoolean, IsNotEmpty, IsString } from 'class-validator'
import { TopicStatus } from '../enum/topic-status.enum'
import { IsOptional, IsNumber, IsDate, IsArray, IsEnum } from 'class-validator'
import { TopicType } from '../enum/topic-type.enum'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'
import { PhaseHistory } from '../schemas/topic.schemas'
import { Transform } from 'class-transformer'
export class CreateTopicDto {
    @IsNotEmpty()
    @IsString()
    titleVN: string

    @IsNotEmpty()
    @IsString()
    titleEng: string

    @IsNotEmpty()
    @IsString()
    description: string

    @IsNotEmpty()
    @IsEnum(TopicType)
    type: TopicType

    @IsNotEmpty()
    majorId: string

    @IsNumber()
    maxStudents: number

    @IsString()
    @IsOptional()
    createBy: string

    @IsNotEmpty()
    @IsEnum(TopicStatus)
    currentStatus: TopicStatus = TopicStatus.Draft // checkbox - nộp luôn hay chưa

    @IsNotEmpty()
    @IsEnum(PeriodPhaseName)
    currentPhase: string

    @IsOptional()
    periodId: string

    //temp fields
    @IsArray()
    @IsNotEmpty()
    fieldIds: string[]

    @IsArray()
    @IsNotEmpty()
    requirementIds?: string[]

    @IsArray()
    @IsOptional()
    studentIds?: string[]

    @IsArray()
    @IsOptional()
    lecturerIds?: string[]

    @IsOptional()
    phaseHistories: PhaseHistory[]

    @IsOptional()
    @Transform(({ value }) => {
        console.log('🔍 Transform allowManualApproval - input:', value, typeof value)
        if (typeof value === 'string') {
            if (value === '1' || value === 'true') return 'true'
            if (value === '0' || value === 'false') return 'false'
            return 'false'
        }
        if (typeof value === 'boolean') return 'value'
        if (typeof value === 'number') return value === 1
        return false
    })
    allowManualApproval: string
}
