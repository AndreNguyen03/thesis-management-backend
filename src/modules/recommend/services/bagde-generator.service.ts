// services/badge-generator.service.ts
import { Injectable, Logger } from '@nestjs/common'
import { CandidateTopicDto } from '../../topics/dtos/candidate-topic.dto'
import { StudentProfileDto } from '../../../users/dtos/student.dto'
import { Badge } from '../dto/recommendation.interface'

@Injectable()
export class BadgeGeneratorService {
    private readonly logger = new Logger(BadgeGeneratorService.name)

    // Lucide icon constants
    private readonly ICONS = {
        GRADUATION_CAP: 'GraduationCap',
        TARGET: 'Target',
        CODE: 'Code',
        HEART: 'Heart',
        LAYERS: 'Layers',
        MICROSCOPE: 'Microscope',
        SEARCH: 'Search',
        BRAIN: 'Brain',
        CHECK_CIRCLE: 'CheckCircle',
        X_CIRCLE: 'XCircle',
        CLOCK: 'Clock',
        ALERT_CIRCLE: 'AlertCircle',
        INFO: 'Info',
        USER_CHECK: 'UserCheck',
        USER_X: 'UserX',
        BOOK_OPEN: 'BookOpen',
        SHIELD: 'Shield',
        SHIELD_CHECK: 'ShieldCheck',
        SHIELD_OFF: 'ShieldOff',
        FLAME: 'Flame',
        ZAP: 'Zap',
        TRENDING_UP: 'TrendingUp',
        DATABASE: 'Database',
        SERVER: 'Server',
        GLOBE: 'Globe',
        BRIEFCASE: 'Briefcase',
        ROCKET: 'Rocket',
        AWARD: 'Award',
        CALENDAR: 'Calendar',
        HAND_SHAKE: 'Handshake',
        TOOL: 'Tool',
        WRENCH: 'Wrench'
    }

    /**
     * Tạo badges cho một đề tài (tự động giới hạn 4-5 badges quan trọng nhất)
     */
    async generateBadges(
        topic: CandidateTopicDto,
        studentProfile: StudentProfileDto,
        semanticScore: number,
        lexicalScore: number
    ): Promise<{
        displayBadges: Badge[] // 4-5 badges để hiển thị
        allBadges: Badge[] // Tất cả badges (cho analysis)
        badgeSummary: string // Tóm tắt ngắn
    }> {
        // 1. Tạo tất cả badges có thể
        const allBadges = await this.generateAllPossibleBadges(topic, studentProfile, semanticScore, lexicalScore)

        // 2. Sắp xếp theo priority (priority thấp = quan trọng hơn)
        const sortedBadges = allBadges.sort((a, b) => a.priority - b.priority)

        // 3. Lấy 4-5 badges quan trọng nhất để hiển thị
        const displayBadges = this.selectDisplayBadges(sortedBadges)

        // 4. Tạo summary ngắn
        const badgeSummary = this.generateBadgeSummary(displayBadges)

        this.logger.debug(`Generated ${displayBadges.length} display badges from ${allBadges.length} total badges`)

        return {
            displayBadges,
            allBadges: sortedBadges,
            badgeSummary
        }
    }

    /**
     * Tạo tất cả badges có thể
     */
    private async generateAllPossibleBadges(
        topic: CandidateTopicDto,
        studentProfile: StudentProfileDto,
        semanticScore: number,
        lexicalScore: number
    ): Promise<Badge[]> {
        const badges: Badge[] = []

        // === CORE BADGES (Priority 1-2) ===

        // 1. STATUS BADGE - Luôn có, cực kỳ quan trọng
        badges.push(this.generateStatusBadge(topic))

        // 2. MAJOR MATCH BADGE - Quan trọng thứ 2
        const majorMatch = this.checkMajorMatch(topic, studentProfile)
        if (majorMatch.hasMatch) {
            badges.push({
                type: 'major_match',
                label: 'Cùng ngành',
                color: 'green',
                icon: this.ICONS.GRADUATION_CAP,
                tooltip: 'Cùng chuyên ngành với bạn',
                priority: 1
            })
        }

        // 3. SKILL MATCH BADGE
        const skillMatch = this.analyzeSkillMatch(topic, studentProfile)
        if (skillMatch.score >= 0.6) {
            badges.push({
                type: 'skill_match_high',
                label: skillMatch.matchedCount >= 3 ? 'Kỹ năng tốt' : 'Kỹ năng phù hợp',
                color: 'blue',
                icon: this.ICONS.CODE,
                tooltip: `${skillMatch.matchedCount} kỹ năng phù hợp`,
                priority: 1
            })
        } else if (skillMatch.score >= 0.3) {
            badges.push({
                type: 'skill_match_medium',
                label: 'Một số kỹ năng',
                color: 'yellow',
                icon: this.ICONS.TOOL,
                tooltip: `${skillMatch.matchedCount} kỹ năng phù hợp`,
                priority: 3
            })
        }

        // === IMPORTANT BADGES (Priority 2-3) ===

        // 4. INTEREST MATCH
        const interestMatch = this.analyzeInterestMatch(topic, studentProfile)
        if (interestMatch.score >= 0.5) {
            badges.push({
                type: 'interest_match',
                label: 'Sở thích',
                color: 'purple',
                icon: this.ICONS.HEART,
                tooltip: `${interestMatch.matchedCount} sở thích trùng`,
                priority: 2
            })
        }

        // 5. CONFIDENCE LEVEL
        const confidence = this.calculateConfidence(semanticScore, lexicalScore, skillMatch.score)
        badges.push({
            type: `confidence_${confidence.level}`,
            label: confidence.label,
            color: confidence.color,
            icon: confidence.icon,
            tooltip: confidence.tooltip,
            priority: confidence.priority
        })

        // === SUPPORTING BADGES (Priority 3-4) ===

        // 6. FIELD MATCH
        const fieldMatch = this.analyzeFieldMatch(topic, studentProfile)
        if (fieldMatch.hasMatch) {
            badges.push({
                type: 'field_match',
                label: 'Lĩnh vực',
                color: 'indigo',
                icon: this.ICONS.LAYERS,
                tooltip: `Lĩnh vực: ${fieldMatch.fieldName}`,
                priority: 3
            })
        }

        // 7. RESEARCH MATCH
        if (topic.researchInterests?.length > 0) {
            const researchMatch = this.analyzeResearchMatch(topic, studentProfile)
            if (researchMatch.score > 0.3) {
                badges.push({
                    type: 'research_match',
                    label: 'Nghiên cứu',
                    color: 'violet',
                    icon: this.ICONS.MICROSCOPE,
                    tooltip: 'Phù hợp hướng nghiên cứu',
                    priority: 3
                })
            }
        }

        // 8. DIFFICULTY LEVEL
        const difficulty = this.estimateDifficulty(topic, studentProfile)
        badges.push({
            type: `difficulty_${difficulty.level}`,
            label: difficulty.label,
            color: difficulty.color,
            icon: difficulty.icon,
            tooltip: difficulty.tooltip,
            priority: 4
        })

        // 9. SEMANTIC SCORE
        if (semanticScore > 0.7) {
            badges.push({
                type: 'semantic_high',
                label: 'Nội dung',
                color: 'green',
                icon: this.ICONS.BRAIN,
                tooltip: 'Nội dung tương đồng cao',
                priority: 3
            })
        }

        // 10. LEXICAL SCORE
        if (lexicalScore > 0.6) {
            badges.push({
                type: 'lexical_high',
                label: 'Từ khóa',
                color: 'blue',
                icon: this.ICONS.SEARCH,
                tooltip: 'Nhiều từ khóa trùng khớp',
                priority: 4
            })
        }

        // === WARNING BADGES (Priority 4-5) ===

        // 11. MISSING SKILLS WARNING
        if (skillMatch.missingCount >= 3) {
            badges.push({
                type: 'skill_gap',
                label: 'Cần học',
                color: 'orange',
                icon: this.ICONS.BOOK_OPEN,
                tooltip: `Cần học thêm ${skillMatch.missingCount} kỹ năng`,
                priority: 5
            })
        }

        // 12. PROFILE INCOMPLETE WARNING
        const profileCompleteness = this.calculateProfileCompleteness(studentProfile)
        if (profileCompleteness < 0.3) {
            badges.push({
                type: 'profile_incomplete',
                label: 'Thiếu info',
                color: 'orange',
                icon: this.ICONS.INFO,
                tooltip: 'Cần cập nhật thông tin profile',
                priority: 5
            })
        }

        return badges
    }

    /**
     * Chọn 4-5 badges để hiển thị (ưu tiên cao nhất)
     */
    private selectDisplayBadges(allBadges: Badge[]): Badge[] {
        if (allBadges.length <= 4) {
            return allBadges
        }

        // Luôn đảm bảo có status badge
        const statusBadge = allBadges.find((b) => b.type.startsWith('status_'))
        const otherBadges = allBadges.filter((b) => !b.type.startsWith('status_'))

        // Lấy badges priority 1-2 trước
        const highPriorityBadges = otherBadges.filter((b) => b.priority <= 2)
        const mediumPriorityBadges = otherBadges.filter((b) => b.priority === 3)
        const lowPriorityBadges = otherBadges.filter((b) => b.priority >= 4)

        // Xây dựng display badges
        const displayBadges: Badge[] = []

        // 1. Luôn thêm status badge nếu có
        if (statusBadge) {
            displayBadges.push(statusBadge)
        }

        // 2. Thêm high priority badges (tối đa 2 cái)
        displayBadges.push(...highPriorityBadges.slice(0, 2))

        // 3. Thêm medium priority nếu còn slot (ưu tiên unique types)
        const currentTypes = new Set(displayBadges.map((b) => b.type))
        const uniqueMediumBadges = mediumPriorityBadges.filter((b) => !currentTypes.has(b.type))

        const remainingSlots = 5 - displayBadges.length
        if (remainingSlots > 0) {
            displayBadges.push(...uniqueMediumBadges.slice(0, remainingSlots))
        }

        // 4. Nếu vẫn còn slot, thêm low priority (nhưng ưu tiên warning badges)
        if (displayBadges.length < 4) {
            const warningBadges = lowPriorityBadges.filter(
                (b) => b.type.includes('gap') || b.type.includes('incomplete')
            )
            displayBadges.push(...warningBadges.slice(0, 1))
        }

        // Đảm bảo không quá 5 badges
        return displayBadges.slice(0, 5)
    }

    /**
     * Tạo badge summary ngắn
     */
    private generateBadgeSummary(badges: Badge[]): string {
        const summaryParts: string[] = []

        // Check major match
        const hasMajorMatch = badges.some((b) => b.type === 'major_match')
        if (hasMajorMatch) summaryParts.push('Cùng ngành')

        // Check skill match
        const hasSkillMatch = badges.some((b) => b.type.includes('skill_match'))
        if (hasSkillMatch) summaryParts.push('Kỹ năng phù hợp')

        // Check open status
        const isOpen = badges.some((b) => b.type === 'status_open')
        if (isOpen) summaryParts.push('Mở đăng ký')

        // Check confidence
        const confidenceBadge = badges.find((b) => b.type.startsWith('confidence_'))
        if (confidenceBadge) {
            if (confidenceBadge.type === 'confidence_high') summaryParts.push('Tin cậy cao')
            else if (confidenceBadge.type === 'confidence_medium') summaryParts.push('Khả thi')
        }

        // Fallback
        if (summaryParts.length === 0) {
            if (badges.some((b) => b.type === 'interest_match')) summaryParts.push('Sở thích')
            if (badges.some((b) => b.type === 'field_match')) summaryParts.push('Lĩnh vực liên quan')
        }

        return summaryParts.length > 0 ? summaryParts.slice(0, 2).join(' • ') : 'Đề tài được đề xuất'
    }

    /**
     * Helper methods (viết ngắn gọn)
     */
    private generateStatusBadge(topic: CandidateTopicDto): Badge {
        const status = topic.currentStatus?.toLowerCase() || 'unknown'

        switch (status) {
            case 'open':
                return {
                    type: 'status_open',
                    label: 'Mở ĐK',
                    color: 'green',
                    icon: this.ICONS.CHECK_CIRCLE,
                    tooltip: 'Đang mở đăng ký',
                    priority: 1
                }
            case 'closed':
                return {
                    type: 'status_closed',
                    label: 'Đã đóng',
                    color: 'red',
                    icon: this.ICONS.X_CIRCLE,
                    tooltip: 'Đã đóng đăng ký',
                    priority: 1
                }
            case 'pending':
                return {
                    type: 'status_pending',
                    label: 'Chờ duyệt',
                    color: 'yellow',
                    icon: this.ICONS.CLOCK,
                    tooltip: 'Đang chờ phê duyệt',
                    priority: 1
                }
            default:
                return {
                    type: 'status_unknown',
                    label: 'Chưa rõ',
                    color: 'gray',
                    icon: this.ICONS.INFO,
                    tooltip: 'Trạng thái chưa xác định',
                    priority: 1
                }
        }
    }

    private checkMajorMatch(
        topic: CandidateTopicDto,
        student: StudentProfileDto
    ): {
        hasMatch: boolean
        reason: string
    } {
        // Simplified major matching logic
        return {
            hasMatch: topic.majorId === student.major,
            reason: topic.majorId === student.major ? 'Cùng mã chuyên ngành' : 'Khác chuyên ngành'
        }
    }

    private analyzeSkillMatch(
        topic: CandidateTopicDto,
        student: StudentProfileDto
    ): {
        matchedCount: number
        missingCount: number
        score: number
    } {
        const topicSkills = this.extractSkillsFromTopic(topic)
        const studentSkills = student.skills?.map((s) => s.toLowerCase()) || []

        const matchedSkills = topicSkills.filter((skill) =>
            studentSkills.some((studentSkill) => studentSkill.includes(skill) || skill.includes(studentSkill))
        )

        return {
            matchedCount: matchedSkills.length,
            missingCount: topicSkills.length - matchedSkills.length,
            score: topicSkills.length > 0 ? matchedSkills.length / topicSkills.length : 0
        }
    }

    private analyzeInterestMatch(
        topic: CandidateTopicDto,
        student: StudentProfileDto
    ): {
        matchedCount: number
        score: number
    } {
        const topicKeywords = [...(topic.areaInterest || []), ...(topic.fields?.map((f) => f.name) || [])].map((k) =>
            k.toLowerCase()
        )

        const studentInterests = student.interests?.map((i) => i.toLowerCase()) || []

        const matched = studentInterests.filter((interest) =>
            topicKeywords.some((keyword) => keyword.includes(interest) || interest.includes(keyword))
        )

        return {
            matchedCount: matched.length,
            score: studentInterests.length > 0 ? matched.length / studentInterests.length : 0
        }
    }

    private calculateConfidence(
        semanticScore: number,
        lexicalScore: number,
        skillScore: number
    ): {
        level: 'high' | 'medium' | 'low'
        label: string
        color: Badge['color']
        icon: string
        tooltip: string
        priority: number
    } {
        const combinedScore = semanticScore * 0.4 + lexicalScore * 0.3 + skillScore * 0.3

        if (combinedScore >= 0.7) {
            return {
                level: 'high',
                label: 'Tin cậy cao',
                color: 'green',
                icon: this.ICONS.SHIELD_CHECK,
                tooltip: 'Độ tin cậy cao',
                priority: 2
            }
        } else if (combinedScore >= 0.4) {
            return {
                level: 'medium',
                label: 'Khả thi',
                color: 'yellow',
                icon: this.ICONS.SHIELD,
                tooltip: 'Độ tin cậy trung bình',
                priority: 3
            }
        } else {
            return {
                level: 'low',
                label: 'Tham khảo',
                color: 'orange',
                icon: this.ICONS.SHIELD_OFF,
                tooltip: 'Độ tin cậy thấp',
                priority: 4
            }
        }
    }

    private analyzeFieldMatch(
        topic: CandidateTopicDto,
        student: StudentProfileDto
    ): {
        hasMatch: boolean
        fieldName: string
    } {
        const studentText = `${student.interests?.join(' ')} ${student.bio || ''}`.toLowerCase()
        const firstField = topic.fields?.[0]?.name || ''

        return {
            hasMatch: studentText.includes(firstField.toLowerCase()),
            fieldName: firstField
        }
    }

    private analyzeResearchMatch(
        topic: CandidateTopicDto,
        student: StudentProfileDto
    ): {
        score: number
    } {
        const researchInterests = topic.researchInterests?.map((r) => r.toLowerCase()) || []
        const studentText = `${student.interests?.join(' ')} ${student.bio || ''}`.toLowerCase()

        const matched = researchInterests.filter((research) => studentText.includes(research))

        return {
            score: researchInterests.length > 0 ? matched.length / researchInterests.length : 0
        }
    }

    private estimateDifficulty(
        topic: CandidateTopicDto,
        student: StudentProfileDto
    ): {
        level: 'beginner' | 'intermediate' | 'advanced'
        label: string
        color: Badge['color']
        icon: string
        tooltip: string
    } {
        // Simple difficulty estimation based on topic type
        const type = topic.type?.toLowerCase() || ''
        const studentYear = parseInt(student.class?.match(/\d+/)?.[0] || '1')

        if (type.includes('basic') || type.includes('fundamental') || studentYear <= 2) {
            return {
                level: 'beginner',
                label: 'Cơ bản',
                color: 'green',
                icon: this.ICONS.TRENDING_UP,
                tooltip: 'Phù hợp cho người mới'
            }
        } else if (type.includes('advanced') || type.includes('complex') || studentYear >= 4) {
            return {
                level: 'advanced',
                label: 'Nâng cao',
                color: 'red',
                icon: this.ICONS.FLAME,
                tooltip: 'Yêu cầu kinh nghiệm'
            }
        } else {
            return {
                level: 'intermediate',
                label: 'Trung cấp',
                color: 'orange',
                icon: this.ICONS.ZAP,
                tooltip: 'Phù hợp sinh viên năm 3-4'
            }
        }
    }

    private calculateProfileCompleteness(student: StudentProfileDto): number {
        let score = 0

        if (student.skills?.length >= 3) score += 0.4
        else if (student.skills?.length >= 1) score += 0.2

        if (student.interests?.length >= 2) score += 0.3
        else if (student.interests?.length >= 1) score += 0.1

        if (student.bio && student.bio.length > 50) score += 0.3
        else if (student.bio && student.bio.length > 20) score += 0.1

        return score
    }

    private extractSkillsFromTopic(topic: CandidateTopicDto): string[] {
        const skills = new Set<string>()

        // Extract từ requirements
        topic.requirements?.forEach((req) => {
            const text = (req.name + ' ' + req.description).toLowerCase()
            this.addSkillsFromText(text, skills)
        })

        // Extract từ description
        if (topic.description) {
            this.addSkillsFromText(topic.description.toLowerCase(), skills)
        }

        return Array.from(skills)
    }

    private addSkillsFromText(text: string, skills: Set<string>): void {
        const skillKeywords = [
            'javascript',
            'python',
            'java',
            'react',
            'vue',
            'angular',
            'nodejs',
            'express',
            'mongodb',
            'mysql',
            'docker',
            'aws',
            'ai',
            'machine learning',
            'deep learning',
            'data analysis'
        ]

        skillKeywords.forEach((skill) => {
            if (text.includes(skill)) {
                skills.add(skill)
            }
        })
    }
}
