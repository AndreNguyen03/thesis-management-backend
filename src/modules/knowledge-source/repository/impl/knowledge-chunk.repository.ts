import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model } from 'mongoose'
import { KnowledgeChunk } from '../../schemas/knowledge-chunk.schema'
import { IKnowledgeChunkRepository } from '../knowledge-chunk.interface'
import { CreateKnowledgeChunkDto } from '../../dto/create-knowledge-chunk.dto'
import { KnowledgeSource } from '../../schemas/knowledge-source.schema'
import { SourceType } from '../../enums/source_type.enum'

export class KnowledgeChunkRepository
    extends BaseRepositoryAbstract<KnowledgeChunk>
    implements IKnowledgeChunkRepository
{
    constructor(
        @InjectModel(KnowledgeChunk.name) private readonly knowledgeChunkModel: Model<KnowledgeChunk>,
        @InjectModel(KnowledgeSource.name) private readonly knowledgeSourceModel: Model<KnowledgeSource>
    ) {
        super(knowledgeChunkModel)
    }
    async upsertSingleKnowledgeChunk(createKnowledgeChunkDtos: CreateKnowledgeChunkDto[]): Promise<boolean> {
        console.log(`🔧 upsertSingleKnowledgeChunk called with ${createKnowledgeChunkDtos.length} chunks`)
        const sourceId = createKnowledgeChunkDtos[0]?.source_id
        console.log(`📋 First chunk source_id: ${sourceId}`)

        // Get source type to determine insert strategy
        const source = await this.knowledgeSourceModel.findById(sourceId).exec()
        if (!source) {
            throw new Error(`Knowledge source not found: ${sourceId}`)
        }

        const sourceType = source.source_type
        console.log(`📦 Source type: ${sourceType}`)

        // URL/FILE: Many chunks per source → use insertMany
        if (sourceType === SourceType.URL || sourceType === SourceType.FILE) {
            try {
                const result = await this.knowledgeChunkModel.insertMany(createKnowledgeChunkDtos)
                console.log(`✅ Inserted ${result.length} chunks for ${sourceType}`)
                console.log(
                    `📋 Sample chunk IDs:`,
                    result.slice(0, 3).map((c) => c._id.toString())
                )
                return result.length > 0
            } catch (error) {
                console.error('❌ Error inserting chunks:', error)
                throw error
            }
        }

        // LECTURER/TOPIC: 1 chunk per entity → use upsert to update when changed
        const bulkOps = createKnowledgeChunkDtos.map((dto) => ({
            updateOne: {
                filter: {
                    source_id: dto.source_id
                    // For single-chunk sources, we can safely filter by source_id
                    // since there should only be one chunk per source
                },
                update: { $set: dto },
                upsert: true
            }
        }))

        try {
            const result = await this.knowledgeChunkModel.bulkWrite(bulkOps)
            console.log(
                `✅ Upserted ${result.upsertedCount} and modified ${result.modifiedCount} chunks for ${sourceType}`
            )
            return result.upsertedCount > 0 || result.modifiedCount > 0
        } catch (error) {
            console.error('❌ Error upserting chunks:', error)
            throw error
        }
    }
    async insertManyKnowledgeChunks(createKnowledgeChunkDtos: CreateKnowledgeChunkDto[]): Promise<boolean> {
        //xóa hết các chunk hiện có của source_id trước khi insert nhiều chunk mới
        await this.knowledgeChunkModel
            .deleteMany({ source_id: new mongoose.Types.ObjectId(createKnowledgeChunkDtos[0].source_id) })
            .exec()
        const result = await this.knowledgeChunkModel.insertMany(createKnowledgeChunkDtos)
        return result.length > 0
    }
    async updateKnowledgeChunks(sourceId: string, isDeleteNeeded: boolean): Promise<boolean> {
        const res = await this.knowledgeChunkModel
            .updateMany({ source_id: sourceId }, { deleted_at: isDeleteNeeded ? new Date() : null })
            .exec()
        return res.modifiedCount > 0
    }
}
