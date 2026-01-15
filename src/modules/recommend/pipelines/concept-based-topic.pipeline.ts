/**
 * Concept-Based Topic Recommendation Pipeline
 * Replaces semantic search with concept extraction + matching
 */

import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import mongoose from 'mongoose'
import { StudentService } from '../../../users/application/student.service'
import { TopicSearchService } from '../../topic_search/application/search.service'
import { RecommendationResult } from '../dto/recommendation-response.dto'
import { CandidateTopicDto } from '../../topics/dtos/candidate-topic.dto'
import { StudentProfileDto } from '../../../users/dtos/student.dto'
import { TopicStatus } from '../../topics/enum'
import { ProfileMatchingProvider } from '../../matching/providers/profile-matching.provider'
import { extractStudentConcepts } from '../../matching/utils/concept-mapper'
import { extractTopicConcepts } from '../utils/topic-concept-mapper'
import { matchStudentLecturer, rankMatches } from '../../matching/utils/matching-engine'
import { Student } from '../../../users/schemas/student.schema'
import { User } from '../../../users/schemas/users.schema'
import { Badge } from '../dto/recommendation.interface'

@Injectable()
export class ConceptBasedTopicPipeline {
    private readonly logger = new Logger(ConceptBasedTopicPipeline.name)

    constructor(
        private readonly studentService: StudentService,
        private readonly topicSearchService: TopicSearchService,
        private readonly profileMatchingProvider: ProfileMatchingProvider,
        @InjectModel(Student.name) private readonly studentModel: Model<Student>,
        @InjectModel(User.name) private readonly userModel: Model<User>
    ) {}

    async runPipeline(studentId: string, periodId: string, limit: number = 10): Promise<RecommendationResult[]> {
        this.logger.log(`[CONCEPT PIPELINE] Starting for student ${studentId}, period ${periodId}`)
        const startTime = Date.now()

        try {
            // B1: Load data
            const [studentProfile, candidateTopics] = await this.loadData(studentId, periodId)

            if (!studentProfile || !candidateTopics || candidateTopics.length === 0) {
                this.logger.warn('No student profile or topics found, using fallback')
                return this.getFallbackRecommendations(candidateTopics || [])
            }

            // B2: Validate profile
            if (!this.isProfileValid(studentProfile)) {
                this.logger.warn('Incomplete student profile, using fallback')
                return this.getFallbackRecommendations(candidateTopics)
            }

            // B3: Get concept index from ProfileMatchingProvider
            const conceptIndex = (this.profileMatchingProvider as any).conceptIndex
            if (!conceptIndex) {
                this.logger.error('Concept index not loaded')
                return this.getFallbackRecommendations(candidateTopics)
            }

            this.logger.debug(`[CONCEPT INDEX] Loaded with ${Object.keys(conceptIndex.byKey).length} concepts`)

            // B4: Extract student concepts
            const student = await this.studentModel.findOne({ userId: new mongoose.Types.ObjectId(studentId) }).lean()
            if (!student) {
                this.logger.error('Student not found')
                return this.getFallbackRecommendations(candidateTopics)
            }

            const user = await this.userModel.findById(studentId).lean()
            const skills = Array.isArray(student.skills) ? student.skills.filter(Boolean) : []
            const interests = Array.isArray(student.interests) ? student.interests.filter(Boolean) : []

            const studentResult = extractStudentConcepts({ skills, interests }, conceptIndex)

            if (studentResult.concepts.length === 0) {
                this.logger.warn('No student concepts extracted, using fallback')
                return this.getFallbackRecommendations(candidateTopics)
            }

            this.logger.debug(`[STUDENT CONCEPTS] Extracted ${studentResult.concepts.length} concepts`)

            // B5: Extract topic concepts
            const topicConceptsResults = candidateTopics.map((topic) =>
                extractTopicConcepts(topic, conceptIndex, { minDepth: 3 })
            )

            const topicsWithConcepts = topicConceptsResults.filter((t) => t.concepts.length > 0)

            if (topicsWithConcepts.length === 0) {
                this.logger.warn('No topic concepts extracted, using fallback')
                return this.getFallbackRecommendations(candidateTopics)
            }

            this.logger.debug(
                `[TOPIC CONCEPTS] ${topicsWithConcepts.length}/${candidateTopics.length} topics have concepts`
            )

            // B6: Match student concepts với từng topic
            const matches: Array<{
                topic: CandidateTopicDto
                topicConceptResult: any
                matchResult: any
            }> = []

            for (const topicConceptResult of topicsWithConcepts) {
                const matchResult = matchStudentLecturer(studentResult.concepts, topicConceptResult.concepts, {
                    minDepth: 3,
                    minScore: 0.5,
                    enableParentBoost: true
                })

                if (matchResult) {
                    const topic = candidateTopics.find((t) => t._id === topicConceptResult.topicId)
                    if (topic) {
                        matches.push({
                            topic,
                            topicConceptResult,
                            matchResult
                        })
                    }
                }
            }

            if (matches.length === 0) {
                this.logger.warn('No matches found, using fallback')
                return this.getFallbackRecommendations(candidateTopics)
            }

            this.logger.debug(`[MATCHES] Found ${matches.length} matching topics`)

            // B7: Rank matches
            const rankedMatches = rankMatches(
                matches.map((m) => ({
                    ...m,
                    score: m.matchResult.score,
                    conceptCount: m.matchResult.conceptCount
                })),
                { topN: limit, minScore: 0.5, minConceptCount: 1 }
            )

            // B8: Generate badges based on matched concepts
            const finalResults: RecommendationResult[] = rankedMatches.map((match, idx) => {
                const { topic, matchResult, topicConceptResult } = match as any

                // Generate rule-based badges
                const badges = this.generateBadges(matchResult, topicConceptResult, topic)

                const { embedding, ...topicWithoutEmbedding } = topic

                return {
                    topic: topicWithoutEmbedding,
                    type: 'recommend',
                    rank: idx + 1,
                    semanticScore: matchResult.score,
                    badges,
                    badgeSummary: badges.map((b) => b.label).join(', ')
                }
            })

            const duration = Date.now() - startTime
            this.logger.log(`[CONCEPT PIPELINE] Completed in ${duration}ms, ${finalResults.length} recommendations`)

            return finalResults
        } catch (error) {
            this.logger.error(`[CONCEPT PIPELINE] Error: ${error.message}`, error.stack)
            return []
        }
    }

    /**
     * Generate rule-based badges from matched concepts
     */
    private generateBadges(matchResult: any, topicConceptResult: any, topic: CandidateTopicDto): Badge[] {
        const badges: Badge[] = []

        // Badge 1: Match quality
        const score = matchResult.score
        if (score >= 10) {
            badges.push({
                type: 'high_match',
                label: 'Rất phù hợp',
                color: 'green',
                icon: 'CheckCircle',
                tooltip: `Điểm match: ${score.toFixed(1)}/20, có ${matchResult.conceptCount} concepts chung`,
                priority: 1
            })
        } else if (score >= 5) {
            badges.push({
                type: 'good_match',
                label: 'Phù hợp',
                color: 'blue',
                icon: 'ThumbsUp',
                tooltip: `Điểm match: ${score.toFixed(1)}/20, có ${matchResult.conceptCount} concepts chung`,
                priority: 2
            })
        }

        // Badge 2: Matched concepts breakdown
        const matchedFromFields = matchResult.matchedConcepts.filter(
            (c: any) => c.sources?.includes('field') || c.lecturerSource === 'field'
        ).length
        const matchedFromRequirements = matchResult.matchedConcepts.filter(
            (c: any) => c.sources?.includes('requirement') || c.lecturerSource === 'requirement'
        ).length

        if (matchedFromFields > 0) {
            badges.push({
                type: 'field_match',
                label: `${matchedFromFields} lĩnh vực trùng`,
                color: 'purple',
                icon: 'Target',
                tooltip: `Đề tài có lĩnh vực trùng với kỹ năng của bạn`,
                priority: 3
            })
        }

        if (matchedFromRequirements > 0) {
            badges.push({
                type: 'requirement_match',
                label: `${matchedFromRequirements} yêu cầu phù hợp`,
                color: 'orange',
                icon: 'Zap',
                tooltip: `Bạn đáp ứng được các yêu cầu kỹ thuật của đề tài`,
                priority: 4
            })
        }

        // Badge 3: Topic availability
        if (topic.studentsNum < topic.maxStudents) {
            const slotsLeft = topic.maxStudents - topic.studentsNum
            badges.push({
                type: 'available',
                label: `Còn ${slotsLeft} chỗ`,
                color: 'green',
                icon: 'Users',
                tooltip: `Đề tài còn ${slotsLeft}/${topic.maxStudents} chỗ trống`,
                priority: 5
            })
        } else {
            badges.push({
                type: 'full',
                label: 'Đã đủ sinh viên',
                color: 'red',
                icon: 'AlertCircle',
                tooltip: 'Đề tài đã đủ số lượng sinh viên',
                priority: 5
            })
        }

        // Badge 4: High depth concepts (advanced topics)
        const highDepthConcepts = matchResult.matchedConcepts.filter((c: any) => c.depth >= 5)
        if (highDepthConcepts.length > 0) {
            badges.push({
                type: 'advanced',
                label: 'Chuyên sâu',
                color: 'indigo',
                icon: 'Star',
                tooltip: `Đề tài có ${highDepthConcepts.length} concepts chuyên sâu match với profile bạn`,
                priority: 2
            })
        }

        return badges.slice(0, 4) // Limit to 4 badges
    }

    /**
     * Load student profile and candidate topics
     */
    private async loadData(
        studentId: string,
        periodId: string
    ): Promise<[StudentProfileDto | null, CandidateTopicDto[]]> {
        try {
            const [studentProfile, candidateTopics] = await Promise.all([
                this.studentService.getStudentProfile(studentId),
                this.topicSearchService.getPendingRegistrationTopics(periodId)
            ])

            return [studentProfile, candidateTopics || []]
        } catch (error) {
            this.logger.error(`Failed to load data: ${error.message}`)
            return [null, []]
        }
    }

    /**
     * Validate student profile
     */
    private isProfileValid(profile: StudentProfileDto | null): boolean {
        if (!profile) return false

        const hasSkills = profile.skills && profile.skills.length > 0
        const hasInterests = profile.interests && profile.interests.length > 0
        const hasBio = profile.bio && profile.bio.trim().length > 20

        const validFieldsCount = [hasSkills, hasInterests, hasBio].filter(Boolean).length
        return validFieldsCount >= 2
    }

    /**
     * Fallback recommendations when concept matching fails
     */
    private getFallbackRecommendations(topics: CandidateTopicDto[]): RecommendationResult[] {
        this.logger.warn('Using fallback recommendations')

        const validTopics = topics.filter(
            (topic) =>
                topic.currentStatus === TopicStatus.PendingRegistration ||
                topic.currentStatus === TopicStatus.Registered
        )

        if (validTopics.length === 0) {
            return []
        }

        return validTopics
            .sort((a, b) => {
                // Ưu tiên đề tài có nhiều requirements
                const aReqCount = a.requirements?.length || 0
                const bReqCount = b.requirements?.length || 0
                return bReqCount - aReqCount
            })
            .slice(0, 5)
            .map((topic, index) => {
                const { embedding, ...topicWithoutEmbedding } = topic

                return {
                    topic: topicWithoutEmbedding,
                    type: 'fallback',
                    semanticScore: 0.4,
                    badges: [
                        {
                            type: 'fallback',
                            label: 'Đề xuất phổ biến',
                            color: 'blue',
                            icon: 'Info',
                            tooltip: 'Đề xuất khi hồ sơ chưa đủ dữ liệu',
                            priority: 5
                        },
                        {
                            type: 'profile_incomplete',
                            label: 'Cần cập nhật hồ sơ',
                            color: 'orange',
                            icon: 'AlertCircle',
                            tooltip: 'Cập nhật skills, interests để có đề xuất chính xác hơn',
                            priority: 1
                        }
                    ],
                    badgeSummary: 'Đề xuất phổ biến do hồ sơ chưa đầy đủ',
                    rank: index + 1
                }
            })
    }
}
