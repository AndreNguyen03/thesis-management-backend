import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Student } from '../../../users/schemas/student.schema'
import { ConceptMatcherService, ConceptMatch } from './concept-matcher.service'
import { InferredConceptDto, InferConceptResponseDto } from '../dtos/infer-concept-response.dto'
import { groupSkills } from '../utils/text-processor.util'

@Injectable()
export class StudentConceptInferenceService {
    private readonly logger = new Logger(StudentConceptInferenceService.name)

    constructor(
        @InjectModel(Student.name)
        private readonly studentModel: Model<Student>,
        private readonly conceptMatcher: ConceptMatcherService
    ) {}

    /**
     * Main pipeline for inferring concepts from student profile
     */
    async inferConceptsForStudent(studentId: string): Promise<InferConceptResponseDto> {
        this.logger.log(`Starting concept inference for student: ${studentId}`)

        // Step 1: Get student information
        const student = await this.getStudentInfo(studentId)

        // Step 2: Extract and combine all text sources
        const textSources = this.extractTextSources(student)

        // Step 3: Group skills (if needed)
        const groupedSkills = groupSkills(textSources.skills)

        // Step 4: Process each text and match with concepts
        const matches = await this.matchAllTexts(textSources, groupedSkills)

        // Step 5: Transform to response format
        const response = this.transformToResponse(studentId, matches)

        this.logger.log(
            `Concept inference completed for student ${studentId}. Found ${response.totalConcepts} concepts`
        )

        return response
    }

    /**
     * Get student information from database
     */
    private async getStudentInfo(studentId: string): Promise<Student> {
        const student = await this.studentModel.findById(studentId).lean().exec()

        if (!student) {
            throw new NotFoundException(`Student with ID ${studentId} not found`)
        }

        return student
    }

    /**
     * Extract text sources from student profile
     */
    private extractTextSources(student: Student): {
        skills: string[]
        interests: string[]
    } {
        return {
            skills: student.skills || [],
            interests: student.interests || []
        }
    }

    /**
     * Match all texts against concepts
     */
    private async matchAllTexts(
        textSources: { skills: string[]; interests: string[] },
        groupedSkills: string[][]
    ): Promise<ConceptMatch[]> {
        const matches: ConceptMatch[] = []

        // Process skills (grouped)
        for (const skillGroup of groupedSkills) {
            for (const skill of skillGroup) {
                const match = await this.conceptMatcher.matchText(skill)
                if (match) {
                    // Add source information
                    ;(match as any).source = 'skills'
                    matches.push(match)
                }
            }
        }

        // Process interests
        for (const interest of textSources.interests) {
            const match = await this.conceptMatcher.matchText(interest)
            if (match) {
                // Add source information
                ;(match as any).source = 'interests'
                matches.push(match)
            }
        }

        // Remove duplicates (keep best match)
        const uniqueMatches = this.deduplicateMatches(matches)

        return uniqueMatches
    }

    /**
     * Remove duplicate concept matches, keeping the best score
     */
    private deduplicateMatches(matches: ConceptMatch[]): ConceptMatch[] {
        const conceptMap = new Map<string, ConceptMatch>()

        for (const match of matches) {
            const key = match.concept.key
            const existing = conceptMap.get(key)

            if (!existing || match.score > existing.score) {
                conceptMap.set(key, match)
            }
        }

        return Array.from(conceptMap.values()).sort((a, b) => b.score - a.score)
    }

    /**
     * Transform matches to response format
     */
    private transformToResponse(studentId: string, matches: ConceptMatch[]): InferConceptResponseDto {
        const concepts: InferredConceptDto[] = matches.map((match) => ({
            key: match.concept.key,
            label: match.concept.label,
            aliases: match.concept.aliases || [],
            depth: match.concept.depth,
            score: match.score,
            source: (match as any).source || 'unknown',
            matchedText: match.matchedText
        }))

        return {
            studentId,
            keys: concepts.map((c) => c.key),
            labels: concepts.map((c) => c.label),
            aliases: concepts.map((c) => c.aliases),
            concepts,
            totalConcepts: concepts.length
        }
    }

    /**
     * Batch inference for multiple students
     */
    async inferConceptsForMultipleStudents(studentIds: string[]): Promise<InferConceptResponseDto[]> {
        const results: InferConceptResponseDto[] = []

        for (const studentId of studentIds) {
            try {
                const result = await this.inferConceptsForStudent(studentId)
                results.push(result)
            } catch (error) {
                this.logger.error(`Error inferring concepts for student ${studentId}: ${error.message}`)
                // Continue with next student
            }
        }

        return results
    }
}
