import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Student } from '../../../users/schemas/student.schema'
import { Concept } from '../schemas/concept.schema'
import { KnowledgeChunk } from '../../knowledge-source/schemas/knowledge-chunk.schema'
import { KnowledgeSource } from '../../knowledge-source/schemas/knowledge-source.schema'
import { SourceType } from '../../knowledge-source/enums/source_type.enum'
import { GetEmbeddingProvider } from '../../chatbot/providers/get-embedding.provider'
import { ComputeOntologyResponseDto } from '../dto/ontology-extract.dto'
import { normalizeText } from '../utils/text-processor.util'

@Injectable()
export class StudentOntologyService {
    private readonly logger = new Logger(StudentOntologyService.name)

    constructor(
        @InjectModel(Student.name) private studentModel: Model<Student>,
        @InjectModel(Concept.name) private conceptModel: Model<Concept>,
        @InjectModel(KnowledgeChunk.name) private knowledgeChunkModel: Model<KnowledgeChunk>,
        @InjectModel(KnowledgeSource.name) private knowledgeSourceModel: Model<KnowledgeSource>,
        private readonly embeddingProvider: GetEmbeddingProvider
    ) {}

    async computeStudentOntology(studentId: string): Promise<ComputeOntologyResponseDto> {
        try {
            this.logger.log(`Computing ontology for student: ${studentId}`)

            // Validate student exists (find by userId)
            const student = await this.studentModel.findOne({ userId: studentId }).lean()
            if (!student) {
                throw new NotFoundException(`Student with userId ${studentId} not found`)
            }

            // Get description from student's skills and interests
            const description = [...(student.skills || []), ...(student.interests || [])].filter(Boolean).join(', ')

            if (!description) {
                throw new Error('Student has no skills or interests to compute ontology')
            }

            this.logger.log(`Computing ontology from: ${description}`)

            // Normalize text before embedding for consistent matching
            const normalizedDescription = normalizeText(description)
            this.logger.debug(`Normalized text: ${normalizedDescription}`)

            // Generate embedding for description
            const descriptionEmbedding = await this.embeddingProvider.getEmbedding(normalizedDescription)

            // Vector search on concept chunks to find top-5 matches
            const matchedChunks = await this.knowledgeChunkModel.aggregate([
                {
                    $vectorSearch: {
                        index: 'search_knowledge_chunk',
                        path: 'plot_embedding_gemini_large',
                        queryVector: descriptionEmbedding,
                        numCandidates: 1000,
                        limit: 100
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
                        'source.source_type': SourceType.CONCEPT
                    }
                },
                {
                    $project: {
                        conceptKey: '$source.source_location',
                        label: '$source.name',
                        depth: '$source.metadata.depth',
                        aliases: '$source.metadata.aliases',
                        keywords: '$source.metadata.keywords',
                        score: { $meta: 'vectorSearchScore' }
                    }
                },
                {
                    $limit: 5
                }
            ])

            this.logger.log(`Found ${matchedChunks.length} matching concepts for student ${studentId}`)

            // Prepare ontology extract
            const ontology_extract = matchedChunks.map((c) => ({
                conceptKey: c.conceptKey,
                label: c.label,
                score: c.score
            }))

            // Generate embedding from extracted concepts (aliases + keywords)
            const embeddingText = matchedChunks
                .flatMap((c) => [...(c.aliases || []), ...(c.keywords || [])])
                .filter(Boolean)
                .join(', ')

            const studentEmbedding = embeddingText
                ? await this.embeddingProvider.getEmbedding(embeddingText)
                : descriptionEmbedding // Fallback to original description embedding

            // Update student schema
            await this.studentModel.updateOne(
                { userId: studentId },
                {
                    $set: {
                        ontology_extract,
                        embedding: studentEmbedding
                    }
                }
            )

            this.logger.log(`Successfully updated student ${studentId} with ontology extract and embedding`)

            return {
                ontology_extract,
                embedding: studentEmbedding
            }
        } catch (error) {
            this.logger.error(`Failed to compute ontology for student ${studentId}: ${error.message}`, error.stack)
            throw error
        }
    }
}
