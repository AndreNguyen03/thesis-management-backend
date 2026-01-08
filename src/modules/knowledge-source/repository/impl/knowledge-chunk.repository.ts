import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
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
    async upsertKnowledgeChunks(createKnowledgeChunkDtos: CreateKnowledgeChunkDto[]): Promise<boolean> {
        const bulkOps = createKnowledgeChunkDtos.map(dto => ({
            updateOne: {
                filter: { source_id: dto.source_id }, // Assumes dto contains _id for upsert
                update: { $set: dto },
                upsert: true
            }
        }))
        const result = await this.knowledgeChunkModel.bulkWrite(bulkOps)
        return result.upsertedCount > 0 || result.modifiedCount > 0
    }
    async updateKnowledgeChunks(sourceId: string, isDeleteNeeded: boolean): Promise<boolean> {
        const res = await this.knowledgeChunkModel
            .updateMany({ source_id: sourceId }, { deleted_at: isDeleteNeeded ? new Date() : null })
            .exec()
        return res.modifiedCount > 0
    }
}
