import { Injectable } from '@nestjs/common'
import { CandidateTopicDto, RequirementDto } from '../../topics/dtos/candidate-topic.dto'
import { StudentProfileDto } from '../../../users/dtos/student.dto'

interface EnrichedBadge {
    badges: string[]
    explanations: Record<string, number | string>
}

@Injectable()
export class BadgeGenerator {
    constructor() {}

    /**
     * Normalize string để tránh mismatch:
     * "Machine Learning" ≠ "machine learning"
     */
    private normalize(value: string): string {
        return value.trim().toLowerCase()
    }

    /**
     * Sinh badge + explanation cho 1 topic
     * Chỉ dùng dữ liệu structured (skills, interests, score)
     * -> deterministic, explainable
     */
    async enrichBadge(
        { topic, score }: { topic: CandidateTopicDto; score: number },
        student: StudentProfileDto
    ): Promise<EnrichedBadge> {
        /**
         * ========= 1. SKILL MATCH =========
         * Jaccard similarity giữa:
         * - student.skills
         * - topic.requirements[].name
         */
        const studentSkills = new Set((student.skills || []).map((s) => this.normalize(s)))

        const topicReqNames = new Set((topic.requirements || []).map((req: RequirementDto) => this.normalize(req.name)))

        const skillIntersection = [...studentSkills].filter((skill) => topicReqNames.has(skill))

        const skillUnionSize = studentSkills.size + topicReqNames.size - skillIntersection.length

        const skillMatch = skillUnionSize > 0 ? (skillIntersection.length / skillUnionSize) * 100 : 0

        /**
         * ========= 2. INTEREST MATCH =========
         * student.interests VS:
         * - topic.areaInterest
         * - topic.researchInterests
         */
        const studentInterests = new Set((student.interests || []).map((i) => this.normalize(i)))

        const topicInterests = new Set(
            [...(topic.areaInterest || []), ...(topic.researchInterests || [])].map((i) => this.normalize(i))
        )

        const interestIntersection = [...studentInterests].filter((interest) => topicInterests.has(interest))

        const interestUnionSize = studentInterests.size + topicInterests.size - interestIntersection.length

        const interestMatch = interestUnionSize > 0 ? (interestIntersection.length / interestUnionSize) * 100 : 0

        const overlappingInterests = interestIntersection.length > 0 ? interestIntersection.join(', ') : 'Không có'

        /**
         * ========= 3. BADGE RULES =========
         * Rule-based, dễ chỉnh threshold
         */
        const badges: string[] = []

        // Skill badges
        if (skillMatch >= 80) badges.push('Kỹ Năng Rất Phù Hợp')
        else if (skillMatch >= 60) badges.push('Kỹ Năng Phù Hợp')
        else if (skillMatch >= 40) badges.push('Khớp Kỹ Năng Trung Bình')

        // Interest badge
        if (interestMatch >= 50) badges.push('Phù Hợp Sở Thích')

        // Top recommendation badge (semantic score)
        if (score >= 0.8) badges.push('Khuyến Nghị Hàng Đầu')

        /**
         * ========= 4. EXPLANATION =========
         * Dùng cho UI tooltip / detail modal
         */
        const explanations = {
            khopKyNang: Math.round(skillMatch),
            phuHopSoThich: Math.round(interestMatch),
            soThichChung: overlappingInterests,
            diemTongThe: Math.round(score * 100)
        }

        return { badges, explanations }
    }

    /**
     * Sinh badge cho danh sách topic đã được rank
     */
    async generateBadges(
        topCandidates: Array<{
            topic: CandidateTopicDto
            finalScore?: number
            initialScore?: number
            rerankScore?: number
        }>,
        student: StudentProfileDto
    ): Promise<
        Array<{
            topic: CandidateTopicDto
            finalScore?: number
            initialScore?: number
            rerankScore?: number
            badges: string[]
            explanations: Record<string, number | string>
        }>
    > {
        return Promise.all(
            topCandidates.map(async (candidate) => {
                // Ưu tiên initialScore (pure content-based)
                const score = candidate.initialScore ?? candidate.finalScore ?? 0

                const enriched = await this.enrichBadge({ topic: candidate.topic, score }, student)

                return {
                    ...candidate,
                    badges: enriched.badges,
                    explanations: enriched.explanations
                }
            })
        )
    }
}
