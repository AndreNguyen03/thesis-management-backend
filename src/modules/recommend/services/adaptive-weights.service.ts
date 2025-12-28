import { Injectable } from '@nestjs/common'
import { StudentProfileDto } from '../../../users/dtos/student.dto'

@Injectable()
export class AdaptiveWeightsService {
    calculateProfileCompleteness(profile: StudentProfileDto): number {
        let score = 0
        let maxScore = 0

        // Skills (40%)
        maxScore += 2
        if (profile.skills?.length >= 5) score += 2
        else if (profile.skills?.length >= 3) score += 1.5
        else if (profile.skills?.length >= 1) score += 1

        // Interests (30%)
        maxScore += 1.5
        if (profile.interests?.length >= 3) score += 1.5
        else if (profile.interests?.length >= 1) score += 1

        // Bio (20%)
        maxScore += 1
        if (profile.bio?.length > 100) score += 1
        else if (profile.bio?.length > 50) score += 0.7
        else if (profile.bio?.length > 20) score += 0.4

        return score / maxScore
    }

    calculateAdaptiveWeights(completeness: number): {
        semanticWeight: number
        lexicalWeight: number
        reasoning: string
    } {
        if (completeness < 0.3) {
            return {
                semanticWeight: 0.6, // Profile nghèo → ít tin semantic
                lexicalWeight: 0.4, // Tin keyword matching hơn
                reasoning: 'Profile thiếu thông tin, ưu tiên keyword matching'
            }
        } else if (completeness < 0.6) {
            return {
                semanticWeight: 0.7,
                lexicalWeight: 0.3,
                reasoning: 'Profile đầy đủ trung bình'
            }
        } else {
            return {
                semanticWeight: 0.85, // Profile đầy đủ → tin semantic
                lexicalWeight: 0.15,
                reasoning: 'Profile đầy đủ, semantic matching quan trọng hơn'
            }
        }
    }
}
