// services/topic-enhancer.service.ts
import { Injectable, Logger } from '@nestjs/common'
import { CandidateTopicDto, FieldDto, RequirementDto } from '../../topics/dtos/candidate-topic.dto'
import { EnhancedTopic } from '../dto/recommendation.interface'

@Injectable()
export class TopicEnhancerService {
    private readonly logger = new Logger(TopicEnhancerService.name)

    /**
     * Enhance topic với normalized data và summaries
     */
    enhanceTopic(topic: CandidateTopicDto): EnhancedTopic {
        const fieldNames = topic.fields?.map((f) => f.name) || []
        const technicalSkills = this.extractTechnicalSkills(topic)
        const normalizedRequirements = this.normalizeRequirements(topic.requirements || [])

        return {
            ...topic,
            fieldNames,
            technicalSkills,
            normalizedRequirements,
            summary: this.buildTopicSummary(topic)
        }
    }

    /**
     * Build comprehensive summary cho semantic matching
     */
    buildTopicSummary(topic: CandidateTopicDto): string {
        const fields = topic.fields?.map((f) => f.name).join(', ') || 'No fields specified'
        const requirements = topic.requirements?.map((r) => r.name).join(', ') || 'No requirements'

        return `
            TOPIC: ${topic.titleVN} (${topic.titleEng || 'No English title'})
            
            DESCRIPTION:
            ${topic.description || 'No description provided'}
            
            TECHNICAL REQUIREMENTS:
            ${requirements}
            
            FIELDS AND DOMAINS:
            ${fields}
            
            LECTURER INTERESTS:
            ${topic.areaInterest?.join(', ') || 'No area interests'}
            ${topic.researchInterests?.join(', ') || 'No research interests'}
            
            TOPIC METADATA:
            Type: ${topic.type}
            Max Students: ${topic.maxStudents}
            Status: ${topic.currentStatus}
            Phase: ${topic.currentPhase}
        `
    }

    /**
     * Extract technical skills từ requirements
     */
    private extractTechnicalSkills(topic: CandidateTopicDto): string[] {
        const skills = new Set<string>()

        // Từ requirements
        if (topic.requirements) {
            topic.requirements.forEach((req) => {
                this.extractSkillsFromText(req.name).forEach((skill) => skills.add(skill))
                this.extractSkillsFromText(req.description).forEach((skill) => skills.add(skill))
            })
        }

        // Từ description
        if (topic.description) {
            this.extractSkillsFromText(topic.description).forEach((skill) => skills.add(skill))
        }

        // Từ fields
        if (topic.fields) {
            topic.fields.forEach((field) => {
                this.extractSkillsFromText(field.name).forEach((skill) => skills.add(skill))
                this.extractSkillsFromText(field.description).forEach((skill) => skills.add(skill))
            })
        }

        return Array.from(skills)
    }

    /**
     * Extract skills từ text
     */
    private extractSkillsFromText(text: string): string[] {
        if (!text) return []

        const skills = new Set<string>()
        const lowerText = text.toLowerCase()

        // Technical skills dictionary
        const skillPatterns: Record<string, RegExp[]> = {
            javascript: [/javascript/i, /js\b/i, /es6/i],
            python: [/python/i, /py\b/i],
            java: [/java\b/i],
            react: [/react/i],
            angular: [/angular/i],
            vue: [/vue/i],
            nodejs: [/node\.?js/i, /node\b(?!\.)/i],
            express: [/express/i],
            mongodb: [/mongodb/i, /mongo\b/i],
            mysql: [/mysql/i],
            postgresql: [/postgresql/i, /postgres/i],
            docker: [/docker/i],
            kubernetes: [/kubernetes/i, /k8s/i],
            aws: [/aws\b/i, /amazon web services/i],
            azure: [/azure/i],
            git: [/git\b/i],
            ai: [/artificial intelligence/i, /ai\b/i],
            'machine learning': [/machine learning/i, /ml\b/i],
            'deep learning': [/deep learning/i, /dl\b/i],
            'data analysis': [/data analysis/i],
            'data science': [/data science/i]
        }

        // Check for each skill
        Object.entries(skillPatterns).forEach(([skill, patterns]) => {
            if (patterns.some((pattern) => pattern.test(lowerText))) {
                skills.add(skill)
            }
        })

        return Array.from(skills)
    }

    /**
     * Normalize requirements
     */
    private normalizeRequirements(requirements: RequirementDto[]): string[] {
        const normalized = new Set<string>()

        requirements.forEach((req) => {
            if (req.name) {
                normalized.add(req.name.trim().toLowerCase())
            }
            if (req.description) {
                // Tách description thành các từ khóa
                req.description
                    .toLowerCase()
                    .split(/[,.;]\s*|\s+and\s+|\s+or\s+/)
                    .map((part) => part.trim())
                    .filter((part) => part.length > 3)
                    .forEach((part) => normalized.add(part))
            }
        })

        return Array.from(normalized)
    }

    /**
     * Build lexical summary cho keyword matching
     */
    buildLexicalSummary(topic: CandidateTopicDto): string {
        const enhanced = this.enhanceTopic(topic)

        return `
            ${topic.titleVN} 
            ${topic.titleEng || ''}
            ${topic.description || ''}
            ${enhanced.technicalSkills.join(' ')}
            ${enhanced.fieldNames.join(' ')}
            ${topic.areaInterest?.join(' ') || ''}
            ${topic.researchInterests?.join(' ') || ''}
        `.toLowerCase()
    }
}
