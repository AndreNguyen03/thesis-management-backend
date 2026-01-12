import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model } from 'mongoose'
import { KnowledgeChunk } from '../../schemas/knowledge-chunk.schema'
import { IKnowledgeChunkRepository } from '../knowledge-chunk.interface'
import { CreateKnowledgeChunkDto } from '../../dto/create-knowledge-chunk.dto'

export class KnowledgeChunkRepository
    extends BaseRepositoryAbstract<KnowledgeChunk>
    implements IKnowledgeChunkRepository
{
    constructor(@InjectModel(KnowledgeChunk.name) private readonly knowledgeChunkModel: Model<KnowledgeChunk>) {
        super(knowledgeChunkModel)
    }
    async upsertSingleKnowledgeChunk(createKnowledgeChunkDtos: CreateKnowledgeChunkDto[]): Promise<boolean> {
        const bulkOps = createKnowledgeChunkDtos.map((dto) => ({
            updateOne: {
                filter: { source_id: dto.source_id }, // Assumes dto contains _id for upsert
                update: { $set: dto },
                upsert: true
            }
        }))
        const result = await this.knowledgeChunkModel.bulkWrite(bulkOps)
        return result.upsertedCount > 0 || result.modifiedCount > 0
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
