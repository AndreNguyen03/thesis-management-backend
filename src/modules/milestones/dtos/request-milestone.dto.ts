import { Expose } from 'class-transformer'
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { MilestoneType } from '../schemas/milestones.schemas'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'
import { IntersectionType } from '@nestjs/mapped-types'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { LecturerReviewDecision } from '../enums/lecturer-decision.enum'

export class PayloadCreateMilestone {
    @IsNotEmpty()
    groupId: string
    @IsNotEmpty()
    periodId: string
    @IsNotEmpty()
    title: string
    @IsNotEmpty()
    description: string
    @IsNotEmpty()
    dueDate: string
    @IsNotEmpty()
    type: MilestoneType = MilestoneType.SUBMISSION
}

export class PayloadFacultyCreateMilestone {
    @IsNotEmpty()
    periodId: string
    @IsOptional()
    @IsEnum(PeriodPhaseName)
    phaseName: PeriodPhaseName
    @IsNotEmpty()
    title: string
    @IsNotEmpty()
    description: string
    @IsNotEmpty()
    dueDate: string
    @IsNotEmpty()
    type: MilestoneType = MilestoneType.SUBMISSION
}

export class PayloadCreateStrictMilestone {
    @IsNotEmpty()
    periodId: string
    @IsNotEmpty()
    @IsEnum(PeriodPhaseName)
    phaseName: PeriodPhaseName
    @IsNotEmpty()
    title: string
    @IsNotEmpty()
    description: string
    @IsNotEmpty()
    dueDate: string
    @IsNotEmpty()
    type: MilestoneType = MilestoneType.DEFENSE
}

export class PayloadUpdateMilestone {
    @IsNotEmpty()
    title: string
    @IsNotEmpty()
    description: string
    @IsNotEmpty()
    dueDate: string
}

export class UploadReportPayload {
    @IsNotEmpty()
    title: string
    @IsNotEmpty()
    description: string
    @IsNotEmpty()
    dueDate: string
}

export class RequestTopicInMilestoneBatchQuery {

}
export class PaginationRequestTopicInMilestoneQuery extends IntersectionType(
    RequestTopicInMilestoneBatchQuery,
    PaginationQueryDto
) {}



export class RequestLecturerReview 
{
    @IsOptional()
    @IsString()
    comment: string

    @IsNotEmpty()
    @IsEnum(LecturerReviewDecision)
    decision: LecturerReviewDecision
}