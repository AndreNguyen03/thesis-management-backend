import { Expose, Type } from 'class-transformer'
import { FileInfo, MilestoneStatus, MilestoneType } from '../schemas/milestones.schemas'
import { GetMiniUserDto } from '../../../users/dtos/user.dto'
import { ResponseMiniLecturerDto } from '../../../users/dtos/lecturer.dto'
import { GetPaginatedObjectDto } from '../../../common/pagination-an/dtos/get-pagination-list.dtos'
import { LecturerReviewDecision } from '../enums/lecturer-decision.enum'
import { ResponseMiniStudentDto } from '../../../users/dtos/student.dto'

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
    @Expose()
    lecturerFeedback: string
    @Expose()
    @Type(() => ResponseMiniLecturerDto)
    lecturerInfo: ResponseMiniLecturerDto
    @Expose()
    feedbackAt: string
    @Expose()
    lecturerDecision: LecturerReviewDecision
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
    @Expose()
    topicId: string
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

export class GetTopicsInBatchMilestoneDto {
    @Expose()
    _id: string
    @Expose()
    topicId: string
    @Expose()
    titleVN: string
    @Expose()
    titleEng: string
    @Expose()
    majorName: string
    @Expose()
    studentNum: number
    @Expose()
    @Type(() => ResponseMiniLecturerDto)
    lecturers: ResponseMiniLecturerDto[]
    @Expose()
    @Type(() => ResponseMiniStudentDto)
    students: ResponseMiniStudentDto[]
    @Expose()
    status: string
    @Expose()
    milestoneId: string
}
export class PaginatedTopicInBatchMilestone extends GetPaginatedObjectDto {
    @Expose()
    @Type(() => GetTopicsInBatchMilestoneDto)
    data: GetTopicsInBatchMilestoneDto[]
}
