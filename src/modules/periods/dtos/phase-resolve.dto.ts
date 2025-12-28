import { ObjectId } from 'mongoose'
import { PeriodPhaseName } from '../enums/period-phases.enum'
import { ResponseMiniLecturerDto } from '../../../users/dtos/lecturer.dto'
import { ResponseMiniStudentDto } from '../../../users/dtos/student.dto'
export class MissingTopicRecord {
    lecturerId: string
    lecturerName: string
    lecturerEmail: string
    minTopicsRequired: number
    submittedTopicsCount: number
    missingTopicsCount: number
}
export interface Phase1Response {
    periodId: string
    phase: 'submit_topic'
    missingTopics: MissingTopicRecord[]
    canTriggerNextPhase: boolean
    pendingTopics: number
}

export interface Phase2Response {
    periodId: string
    phase: 'open_registration'
    resolveTopics: {
        draft: { topicId: string; title: string }[]
        executing: { topicId: string; title: string }[]
    }
    canTriggerNextPhase: boolean
}
export interface Phase3Response {
    periodId: string
    phase: 'execution'
    // 1. Đề tài chưa nộp báo cáo cuối kỳ (đã có)
    overdueTopics: OverdueTopicInfo[]
    // 2. Đề tài đang tạm dừng/bị delay
    pausedOrDelayedTopics: PausedOrDelayedTopicInfo[]
    // 3. Đề tài chờ giảng viên đánh giá
    pendingLecturerReview: PendingLecturerReview[]
    canTriggerNextPhase: boolean
}

export interface Phase4Response {
    periodId: string
    // phase: 'execution'
    // // 1. Đề tài chưa nộp báo cáo cuối kỳ (đã có)
    // overdueTopics: OverdueTopicInfo[]
    // // 2. Đề tài đang tạm dừng/bị delay
    // pausedOrDelayedTopics: PausedOrDelayedTopicInfo[]
    // // 3. Đề tài chờ giảng viên đánh giá
    // pendingLecturerReview: PendingLecturerReview[]
    canTriggerNextPhase: boolean
}

export interface PausedOrDelayedTopicInfo {
    topicId: string
    titleVN: string
    titleEng: string
    status: 'paused' | 'delayed'
    lecturers: ResponseMiniLecturerDto[]
    students: ResponseMiniStudentDto[]
    reason?: string
}
//quá hạn là nộp rồi
export interface OverdueTopicInfo {
    topicId: string
    titleVN: string
    titleEng: string
    lecturers: ResponseMiniLecturerDto[]
    students: ResponseMiniStudentDto[]
}
export interface PendingLecturerReview {
    topicId: string
    titleVN: string
    titleEng: string
    lecturers: ResponseMiniLecturerDto[]
    students: ResponseMiniStudentDto[]
    submittedAt: Date
    daysPending: number
}

export interface LecturerInfo {
    _id: string
    fullName: string
    email: string
    phone: string
    title: string
    avatarName?: string
    avatarUrl?: string
}

// Chi tiết mỗi phase
export interface PeriodPhaseDetail {
    _id: ObjectId
    deleted_at: Date
    phase: PeriodPhaseName
    startTime: Date
    endTime: Date
    minTopicsPerLecturer: number
    requiredLecturerIds: string[]
    requiredLecturers: LecturerInfo[]
    allowManualApproval: boolean
    status: 'pending' | 'active' | 'completed' | 'timeout'
}

// Chi tiết period
export interface PeriodDetail {
    _id: ObjectId
    deleted_at: Date
    name: string
    facultyId: ObjectId
    currentPhase: PeriodPhaseName
    phases: PeriodPhaseDetail[]
}
