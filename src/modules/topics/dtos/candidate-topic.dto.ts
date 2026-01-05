import { OmitType } from '@nestjs/mapped-types'

export class FieldDto {
    _id: string
    name: string
    slug: string
    description: string
}

export class RequirementDto {
    _id: string
    name: string
    description: string
}

export class CandidateTopicDto {
    _id: string
    titleVN: string
    titleEng: string
    description: string
    type: string // TopicType
    majorId: string
    maxStudents: number
    studentsNum: number
    currentStatus: string // TopicStatus
    currentPhase: string // PeriodPhaseName
    allowManualApproval: boolean
    // Lecturer interests (populated)
    areaInterest: string[]
    researchInterests: string[]
    embedding: number[]
    // Populated arrays
    fields: FieldDto[] // Assuming FieldDto mirrors Field schema
    requirements: RequirementDto[] // Assuming RequirementDto mirrors Requirement schema (e.g., { _id: ObjectId, name: string, description: string })
    createdAt: Date
    updatedAt: Date
}

export class TopicRecommendResponse extends OmitType(CandidateTopicDto, ['embedding']) {}
