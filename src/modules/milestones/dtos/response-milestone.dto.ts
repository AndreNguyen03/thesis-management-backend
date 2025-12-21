import { Expose, Type } from 'class-transformer'
import { FileInfo, MilestoneStatus, MilestoneType } from '../schemas/milestones.schemas'
import { GetMiniUserDto } from '../../../users/dtos/user.dto'

class TaskDto {
    @Expose()
    _id: string
    @Expose()
    groupId: string
    @Expose()
    title: string
    @Expose()
    description: string
    @Expose()
    isCompleted: boolean
    @Expose()
    isDeleted: boolean
}
export class Submission {
    @Expose()
    date: string
    @Expose()
    @Type(() => FileInfo)
    files: FileInfo[]
    @Expose()
    @Type(() => GetMiniUserDto)
    createdBy: GetMiniUserDto
}
export class ResponseMilestone {
    @Expose()
    _id: string
    @Expose()
    groupId: string
    @Expose()
    title: string
    @Expose()
    description: string
    @Expose()
    dueDate: Date
    @Expose()
    type: MilestoneType
    @Expose()
    status: MilestoneStatus
    @Expose()
    @Type(() => Submission)
    submission: Submission
    @Expose()
    @Type(() => Submission)
    submissionHistory: Submission[]
    @Expose()
    @Type(() => TaskDto)
    tasks: TaskDto[]
    @Expose()
    progress: number
}

export class MilestoneDto {
    @Expose()
    _id: string
    @Expose()
    groupId: string
    @Expose()
    title: string
    @Expose()
    description: string
    @Expose()
    dueDate: Date
}
