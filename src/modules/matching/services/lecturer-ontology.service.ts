import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Lecturer } from '../../../users/schemas/lecturer.schema'
import { User } from '../../../users/schemas/users.schema'
import { KnowledgeChunk } from '../../knowledge-source/schemas/knowledge-chunk.schema'
import { KnowledgeSource } from '../../knowledge-source/schemas/knowledge-source.schema'
import { SourceType } from '../../knowledge-source/enums/source_type.enum'
import { KnowledgeStatus } from '../../knowledge-source/enums/knowledge-status.enum'
import { ProcessingStatus } from '../../knowledge-source/enums/processing-status.enum'
import { GetEmbeddingProvider } from '../../chatbot/providers/get-embedding.provider'
import { SyncLecturerResponseDto } from '../dto/ontology-extract.dto'
import { normalizeText } from '../utils/text-processor.util'

@Injectable()
export class LecturerOntologyService {
    private readonly logger = new Logger(LecturerOntologyService.name)

    constructor(
        @InjectModel(Lecturer.name) private lecturerModel: Model<Lecturer>,
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(KnowledgeChunk.name) private knowledgeChunkModel: Model<KnowledgeChunk>,
        @InjectModel(KnowledgeSource.name) private knowledgeSourceModel: Model<KnowledgeSource>,
        private readonly embeddingProvider: GetEmbeddingProvider
    ) {}

    async syncLecturerOntology(lecturerId: string): Promise<SyncLecturerResponseDto> {
        try {
            this.logger.log(`Syncing ontology for lecturer: ${lecturerId}`)

            // Get lecturer with populated user info
            const lecturer = await this.lecturerModel.findById(lecturerId).populate('userId')
            if (!lecturer) {
                throw new NotFoundException(`Lecturer with ID ${lecturerId} not found`)
            }

            const user = lecturer.userId as any

            // Concatenate interests
            const interestsText = [...(lecturer.areaInterest || []), ...(lecturer.researchInterests || [])].join(', ')

            if (!interestsText) {
                throw new Error('Lecturer has no area interests or research interests')
            }

            // Normalize text before embedding
            const normalizedInterests = normalizeText(interestsText)
            this.logger.log(`Normalized interests: ${normalizedInterests}`)

            // Generate embedding for normalized interests
            const interestsEmbedding = await this.embeddingProvider.getEmbedding(normalizedInterests)

            // Vector search on concept chunks to find top-5 matches
            const matchedChunks = await this.knowledgeChunkModel.aggregate([
                {
                    $vectorSearch: {
                        index: 'search_knowledge_chunk',
                        path: 'plot_embedding_gemini_large',
                        queryVector: interestsEmbedding,
                        numCandidates: 1000,
                        limit: 20
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

            this.logger.log(`Found ${matchedChunks.length} matching concepts for lecturer ${lecturerId}`)

            // Prepare ontology extract
            const ontology_extract = matchedChunks.map((c) => ({
                conceptKey: c.conceptKey,
                label: c.label,
                score: c.score
            }))

            // Generate embedding from extracted concepts
            const embeddingText = matchedChunks
                .flatMap((c) => [...(c.aliases || []), ...(c.keywords || [])])
                .filter(Boolean)
                .join(', ')

            const lecturerEmbedding = embeddingText
                ? await this.embeddingProvider.getEmbedding(embeddingText)
                : interestsEmbedding // Fallback

            // Update lecturer schema
            await this.lecturerModel.updateOne(
                { _id: lecturerId },
                {
                    $set: {
                        lecturer_ontology_extract: ontology_extract
                    }
                }
            )

            // Get faculty info
            const faculty = await this.lecturerModel.findById(lecturerId).populate('facultyId').lean()

            // Create or update KnowledgeSource for lecturer profile
            const knowledgeSource = await this.knowledgeSourceModel.findOneAndUpdate(
                {
                    source_type: SourceType.LECTURER_PROFILE,
                    source_location: lecturerId
                },
                {
                    $set: {
                        name: user.fullName || user.username,
                        description: `Lecturer profile: ${user.fullName || user.username}`,
                        source_type: SourceType.LECTURER_PROFILE,
                        source_location: lecturerId,
                        status: KnowledgeStatus.ENABLED,
                        processing_status: ProcessingStatus.COMPLETED,
                        owner: user._id.toString(),
                        metadata: {
                            lecturerId: lecturerId,
                            email: user.email,
                            phone: user.phoneNumber,
                            faculty: (faculty as any)?.facultyId?.name || 'Unknown',
                            areaInterest: lecturer.areaInterest,
                            researchInterests: lecturer.researchInterests,
                            ontology_extract
                        }
                    }
                },
                { upsert: true, new: true }
            )

            // Create or update KnowledgeChunk for lecturer profile
            const chunkResult = await this.knowledgeChunkModel.findOneAndUpdate(
                { source_id: knowledgeSource._id },
                {
                    $set: {
                        source_id: knowledgeSource._id.toString(),
                        text: embeddingText,
                        plot_embedding_gemini_large: lecturerEmbedding
                    }
                },
                { upsert: true, new: true }
            )

            this.logger.log(`Successfully synced lecturer ${lecturerId} with ontology and knowledge chunk`)

            return {
                ontology_extract,
                chunkId: chunkResult._id.toString()
            }
        } catch (error) {
            this.logger.error(`Failed to sync ontology for lecturer ${lecturerId}: ${error.message}`, error.stack)
            throw error
        }
    }

    async syncAllLecturers(): Promise<{ total: number; synced: number; failed: number; errors: any[] }> {
        try {
            this.logger.log('Starting batch sync for all lecturers')

            // Get all lecturers
            const lecturers = await this.lecturerModel.find().lean()
            this.logger.log(`Found ${lecturers.length} lecturers to sync`)

            let synced = 0
            let failed = 0
            const errors: Array<{ lecturerId: string; error: string }> = []

            // Process each lecturer
            for (const lecturer of lecturers) {
                try {
                    await this.syncLecturerOntology(lecturer.userId.toString())
                    synced++
                    this.logger.log(`Progress: ${synced + failed}/${lecturers.length}`)
                } catch (error) {
                    failed++
                    errors.push({
                        lecturerId: lecturer._id.toString(),
                        error: error.message
                    })
                    this.logger.error(`Failed to sync lecturer ${lecturer._id}: ${error.message}`)
                }
            }

            this.logger.log(`Batch sync completed: ${synced} synced, ${failed} failed`)

            return {
                total: lecturers.length,
                synced,
                failed,
                errors
            }
        } catch (error) {
            this.logger.error(`Failed to sync all lecturers: ${error.message}`, error.stack)
            throw error
        }
    }
}
