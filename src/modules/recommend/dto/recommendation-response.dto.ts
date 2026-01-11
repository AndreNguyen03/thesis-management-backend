import { ApiProperty } from '@nestjs/swagger'
import { CandidateTopicDto, FieldDto, RequirementDto, TopicRecommendResponse } from '../../topics/dtos/candidate-topic.dto'
import { Badge } from './recommendation.interface'
import { Major } from '../../majors/schemas/majors.schemas'
import { Field } from '../../fields/schemas/fields.schemas'
import { Requirement } from '../../requirements/schemas/requirement.schemas'
import { ResponseMiniLecturerDto } from '../../../users/dtos/lecturer.dto'
import { CurrentTopicsState } from '../../topics/dtos'

export class RecommendationResponseDtoe {}

export class EnrichedRecommendation extends CandidateTopicDto {
    initialScore?: number
    rerankScore?: number
    finalScore?: number
    badges: string[]
    explanations: Record<string, number | string>
}

export interface RecommendationResult {
    topic: CurrentTopicsState | TopicRecommendResponse
    type: 'fallback' | 'recommend',
    badges?: Badge[]
    badgeSummary?: string
    rank?: number
}


export interface TopicVectorSearch {
    _id: string
    original_id: string
    titleVN: string
    currentStatus: string
    approvedStudentsNum: number
    studentsNum: number
    maxStudents: number
    score: number
    major: Major
    fields: FieldDto[]
    requirements: RequirementDto[]
    lecturers: ResponseMiniLecturerDto[]
    createByInfo: ResponseMiniLecturerDto
}
