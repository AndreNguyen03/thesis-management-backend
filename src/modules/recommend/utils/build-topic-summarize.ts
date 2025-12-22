import { CandidateTopicDto, FieldDto, RequirementDto } from '../../topics/dtos/candidate-topic.dto'

export function buildTopicSummary(topic: CandidateTopicDto): string {
    const titlePart = `${topic.titleVN || ''}${topic.titleEng ? ` (${topic.titleEng})` : ''}`
    const descriptionPart = topic.description || ''
    const requirementsPart =
        topic.requirements?.map((req: RequirementDto) => req.name || req.description || '').join(', ') || 'Chưa có'
    const fieldsPart = topic.fields?.map((field: FieldDto) => field.name).join(', ') || 'Chưa có'
    const areaInterestPart = topic.areaInterest?.join(', ') || 'Chưa có'
    const researchInterestPart = topic.researchInterests?.join(', ') || 'Chưa có'

    const topicSummary = `${titlePart} 
                            Description: ${descriptionPart} 
                            Requirements: ${requirementsPart} 
                            Fields: ${fieldsPart} 
                            Area Interest: ${areaInterestPart} 
                            Research Interest: ${researchInterestPart}`
    return topicSummary
}
