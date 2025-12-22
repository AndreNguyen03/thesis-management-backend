import { ApiProperty } from '@nestjs/swagger'
import { CandidateTopicDto } from '../../topics/dtos/candidate-topic.dto'

export class RecommendationResponseDtoe {}

export class EnrichedRecommendation extends CandidateTopicDto {
    initialScore?: number

    rerankScore?: number

    finalScore?: number

    badges: string[]

    explanations: Record<string, number | string>
}
