import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Student } from '../../../users/schemas/student.schema'
import { Lecturer } from '../../../users/schemas/lecturer.schema'
import { User } from '../../../users/schemas/users.schema'
import { KnowledgeChunk } from '../../knowledge-source/schemas/knowledge-chunk.schema'
import { KnowledgeSource } from '../../knowledge-source/schemas/knowledge-source.schema'
import { SourceType } from '../../knowledge-source/enums/source_type.enum'
import { FindLecturersResponseDto, LecturerMatchResultDto, MatchedConceptDto } from '../dto/matching.dto'

@Injectable()
export class MatchingService {
    private readonly logger = new Logger(MatchingService.name)

    constructor(
        @InjectModel(Student.name) private studentModel: Model<Student>,
        @InjectModel(Lecturer.name) private lecturerModel: Model<Lecturer>,
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(KnowledgeChunk.name) private knowledgeChunkModel: Model<KnowledgeChunk>,
        @InjectModel(KnowledgeSource.name) private knowledgeSourceModel: Model<KnowledgeSource>
    ) {}

    async findMatchingLecturers(studentId: string, topK: number = 10): Promise<FindLecturersResponseDto> {
        try {
            this.logger.log(`Finding matching lecturers for student: ${studentId}`)

            // Get student with ontology extract and embedding
            const student = await this.studentModel.findOne({ userId: studentId }).lean()
            if (!student) {
                throw new NotFoundException(`Student with ID ${studentId} not found`)
            }

            if (!student.embedding || student.embedding.length === 0) {
                throw new Error(
                    'Student has no embedding. Please compute ontology first via POST /students/:id/compute-ontology'
                )
            }

            if (!student.ontology_extract || student.ontology_extract.length === 0) {
                throw new Error('Student has no ontology extract')
            }

            this.logger.log(
                `Student has ${student.ontology_extract.length} extracted concepts and embedding dimension: ${student.embedding.length}`
            )

            // Vector search on lecturer-profile knowledge chunks
            const vectorResults = await this.knowledgeChunkModel.aggregate([
                {
                    $vectorSearch: {
                        index: 'search_knowledge_chunk',
                        path: 'plot_embedding_gemini_large',
                        queryVector: student.embedding,
                        numCandidates: 1000,
                        limit: topK
                    }
                },
                {
                    $lookup: {
                        from: 'knowledge_sources',
                        localField: 'source_id',
                        foreignField: '_id',
                        as: 'source'
                    }
                },
                {
                    $unwind: '$source'
                },
                {
                    $match: {
                        'source.source_type': SourceType.LECTURER_PROFILE
                    }
                },
                {
                    $project: {
                        lecturerId: '$source.source_location',
                        name: '$source.name',
                        email: '$source.metadata.email',
                        phone: '$source.metadata.phone',
                        faculty: '$source.metadata.faculty',
                        ontology_extract: '$source.metadata.ontology_extract',
                        vectorScore: { $meta: 'vectorSearchScore' }
                    }
                }
            ])

            this.logger.log(`Vector search returned ${vectorResults.length} lecturer candidates`)

            // Re-rank based on ontology overlap
            const rankedResults: LecturerMatchResultDto[] = []

            for (const result of vectorResults) {
                // Get lecturer by userId (source_location stores userId, not lecturerId)
                const lecturer = await this.lecturerModel.findOne({ userId: result.lecturerId }).lean()
                if (!lecturer) {
                    this.logger.warn(`Lecturer with userId ${result.lecturerId} not found, skipping`)
                    continue
                }

                if (!lecturer.lecturer_ontology_extract || lecturer.lecturer_ontology_extract.length === 0) {
                    this.logger.warn(`Lecturer ${result.lecturerId} has no ontology extract, skipping`)
                    continue
                }

                // Calculate overlap score
                const { score, matchedConcepts } = this.calculateOverlapScore(
                    student.ontology_extract as any,
                    lecturer.lecturer_ontology_extract as any
                )

                // Get user info for description
                const user = await this.userModel.findOne({ _id: result.lecturerId }).lean()

                rankedResults.push({
                    lecturerId: result.lecturerId,
                    name: result.name,
                    faculty: result.faculty,
                    description: user?.bio || '',
                    phone: result.phone || '',
                    email: result.email || '',
                    matchedConcepts,
                    overlapScore: score,
                    vectorScore: result.vectorScore
                })
            }

            // Sort by overlap score (descending)
            rankedResults.sort((a, b) => b.overlapScore - a.overlapScore)

            this.logger.log(`Ranked ${rankedResults.length} lecturers by overlap score`)

            return {
                results: rankedResults,
                totalMatched: rankedResults.length
            }
        } catch (error) {
            this.logger.error(
                `Failed to find matching lecturers for student ${studentId}: ${error.message}`,
                error.stack
            )
            throw error
        }
    }

    private calculateOverlapScore(
        studentConcepts: Array<{ conceptKey: string; label: string; score: number }>,
        lecturerConcepts: Array<{ conceptKey: string; label: string; score: number }>
    ): { score: number; matchedConcepts: MatchedConceptDto[] } {
        const matchedConcepts: MatchedConceptDto[] = []
        let totalScore = 0

        // Create map for quick lookup
        const lecturerConceptMap = new Map(lecturerConcepts.map((c) => [c.conceptKey, c]))

        for (const studentConcept of studentConcepts) {
            const lecturerConcept = lecturerConceptMap.get(studentConcept.conceptKey)

            if (lecturerConcept) {
                // Calculate depth from conceptKey (count dots)
                const depth = (studentConcept.conceptKey.match(/\./g) || []).length

                // Depth weighting: (1 + depth × 0.3)
                const depthWeight = 1 + depth * 0.3

                // Score contribution
                const contribution = studentConcept.score * lecturerConcept.score * depthWeight

                totalScore += contribution

                matchedConcepts.push({
                    conceptKey: studentConcept.conceptKey,
                    label: studentConcept.label,
                    studentScore: studentConcept.score,
                    lecturerScore: lecturerConcept.score,
                    depth
                })
            }
        }

        // Normalize by sqrt(student_total × lecturer_total)
        const studentTotal = studentConcepts.reduce((sum, c) => sum + c.score, 0)
        const lecturerTotal = lecturerConcepts.reduce((sum, c) => sum + c.score, 0)
        const normalizer = Math.sqrt(studentTotal * lecturerTotal)

        const normalizedScore = normalizer > 0 ? totalScore / normalizer : 0

        return {
            score: normalizedScore,
            matchedConcepts
        }
    }
}
