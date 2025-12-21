import { Expose } from 'class-transformer'
import { IsNotEmpty } from 'class-validator'
import { MilestoneType } from '../schemas/milestones.schemas'

export class PayloadCreateMilestone {
    @IsNotEmpty()
    groupId: string
    @IsNotEmpty()
    title: string
    @IsNotEmpty()
    description: string
    @IsNotEmpty()
    dueDate: string
    @IsNotEmpty()
    type: MilestoneType = MilestoneType.STANDARD
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