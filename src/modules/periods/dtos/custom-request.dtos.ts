export class GetCustomRequestDto {
    currentPeriod: string | null
    currentPhase: string | null
    isEligible: boolean
    reason: string | null
    requirements?: {
        minTopics?: number
        submittedTopics?: number
    }
}
