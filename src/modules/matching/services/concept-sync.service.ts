import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Concept } from '../schemas/concept.schema'
import { KnowledgeChunk } from '../../knowledge-source/schemas/knowledge-chunk.schema'
import { KnowledgeSource } from '../../knowledge-source/schemas/knowledge-source.schema'
import { SourceType } from '../../knowledge-source/enums/source_type.enum'
import { KnowledgeStatus } from '../../knowledge-source/enums/knowledge-status.enum'
import { ProcessingStatus } from '../../knowledge-source/enums/processing-status.enum'
import { GetEmbeddingProvider } from '../../chatbot/providers/get-embedding.provider'
import { normalizeText } from '../utils/text-processor.util'

@Injectable()
export class ConceptSyncService {
    private readonly logger = new Logger(ConceptSyncService.name)

    constructor(
        @InjectModel(Concept.name) private conceptModel: Model<Concept>,
        @InjectModel(KnowledgeChunk.name) private knowledgeChunkModel: Model<KnowledgeChunk>,
        @InjectModel(KnowledgeSource.name) private knowledgeSourceModel: Model<KnowledgeSource>,
        private readonly embeddingProvider: GetEmbeddingProvider
    ) {}

    async syncConceptsToKnowledgeChunks(): Promise<{ synced: number; message: string }> {
        try {
            this.logger.log('Starting concept sync to knowledge chunks...')

            const concepts = await this.conceptModel.find().lean()
            this.logger.log(`Found ${concepts.length} concepts to sync`)

            let synced = 0
            const batchSize = 10

            for (let i = 0; i < concepts.length; i += batchSize) {
                const batch = concepts.slice(i, i + batchSize)

                await Promise.all(
                    batch.map(async (concept) => {
                        try {
                            // Generate embedding text from aliases + keywords
                            const embeddingText = [...concept.aliases, ...(concept.keywords || [])]
                                .filter(Boolean)
                                .join(', ')

                            if (!embeddingText) {
                                this.logger.warn(`Concept ${concept.key} has no aliases or keywords, skipping`)
                                return
                            }

                            // Normalize text before embedding for consistent matching
                            const normalizedText = normalizeText(embeddingText)

                            // Generate embedding
                            const embedding = await this.embeddingProvider.getEmbedding(normalizedText)

                            // Create or update KnowledgeSource for concept
                            const knowledgeSource = await this.knowledgeSourceModel.findOneAndUpdate(
                                {
                                    source_type: SourceType.CONCEPT,
                                    name: concept.label
                                },
                                {
                                    $set: {
                                        name: concept.label,
                                        description: `Concept: ${concept.key}`,
                                        source_type: SourceType.CONCEPT,
                                        source_location: concept.key,
                                        status: KnowledgeStatus.ENABLED,
                                        processing_status: ProcessingStatus.COMPLETED,
                                        owner: '000000000000000000000000', // System owner
                                        metadata: {
                                            conceptKey: concept.key,
                                            depth: concept.depth,
                                            aliases: concept.aliases,
                                            keywords: concept.keywords || []
                                        }
                                    }
                                },
                                { upsert: true, new: true }
                            )

                            // Create or update KnowledgeChunk linked to source
                            await this.knowledgeChunkModel.findOneAndUpdate(
                                { source_id: knowledgeSource._id },
                                {
                                    $set: {
                                        source_id: knowledgeSource._id.toString(),
                                        text: embeddingText,
                                        plot_embedding_gemini_large: embedding
                                    }
                                },
                                { upsert: true }
                            )

                            // Update the concept document with embedding
                            await this.conceptModel.updateOne({ _id: concept._id }, { $set: { embedding: embedding } })

                            synced++
                        } catch (error) {
                            this.logger.error(`Failed to sync concept ${concept.key}: ${error.message}`)
                        }
                    })
                )

                this.logger.log(`Synced batch ${i / batchSize + 1}/${Math.ceil(concepts.length / batchSize)}`)
            }

            this.logger.log(`Sync completed: ${synced} concepts synced`)

            return {
                synced,
                message: `Successfully synced ${synced} concepts to knowledge chunks`
            }
        } catch (error) {
            this.logger.error(`Failed to sync concepts: ${error.message}`, error.stack)
            throw error
        }
    }
}
