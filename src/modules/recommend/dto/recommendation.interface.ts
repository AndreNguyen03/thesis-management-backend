import { StudentProfileDto } from '../../../users/dtos/student.dto'
import { CandidateTopicDto } from '../../topics/dtos/candidate-topic.dto'

export interface EnhancedStudentProfile extends StudentProfileDto {
    profileCompleteness: number
    normalizedSkills: string[]
    normalizedInterests: string[]
}

export interface EnhancedTopic extends CandidateTopicDto {
    summary: string
    normalizedRequirements: string[]
    technicalSkills: string[]
    fieldNames: string[]
}

export interface ScoringMetrics {
    semanticScore: number
    lexicalScore: number
    finalScore: number
    confidence: 'high' | 'medium' | 'low'
    profileCompleteness: number
    adaptiveWeights: {
        semantic: number
        lexical: number
        reasoning: string
    }
}

export interface Explanation {
    type:
        | 'skill_match'
        | 'interest_match'
        | 'field_match'
        | 'major_match'
        | 'research_interest_match'
        | 'difficulty_match'
        | 'lexical_overlap'
    title: string
    description: string
    scoreImpact: number // -1 to 1
    evidence: string[]
    icon: string
}

export interface Badge {
    type: string
    label: string
    color: 'green' | 'blue' | 'purple' | 'indigo' | 'orange' | 'red' | 'yellow' | 'gray' | 'violet'
    icon: string
    tooltip: string
    priority: number 
}

export interface MatchDetails {
    matchedSkills: string[]
    matchedInterests: string[]
    matchedResearchInterests: string[]
    matchedFields: string[]
    missingSkills: string[]
    confidenceLevel: string
    suggestedActions: string[]
    matchScoreBreakdown: {
        skills: number
        interests: number
        research: number
        fields: number
        major: number
    }
}

export interface EnrichedRecommendation {
    topic: CandidateTopicDto
    metrics: ScoringMetrics
    badges: Badge[]
    explanations: Explanation[]
    matchDetails: MatchDetails
    rank: number
    recommendationStrength: 'strong' | 'moderate' | 'weak'
}
