import { ObjectId } from 'mongoose'
import { PeriodPhaseName } from '../enums/period-phases.enum'
import { PeriodPhase } from '../schemas/period.schemas'

export interface Phase1Response {
    periodId: string
    phase: 'submit_topic'
    missingTopics: {
        lecturerId: string
        lecturerName: string
        lecturerEmail: string
        minTopicsRequired: number
        submittedTopicsCount: number
        missingTopicsCount: number
    }[]
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
    overdueTopics: {
        topicId: string
        title: string
        lecturerId: string
        lecturerEmail: string
        studentIds: string[]
        studentEmails: string[]
    }
    canTriggerNextPhase: boolean
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
    status: 'not_started' | 'ongoing' | 'completed'
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
