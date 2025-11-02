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
    async createKnowledgeChunk(createKnowledgeChunkDtos: CreateKnowledgeChunkDto): Promise<boolean> {
        const result = await this.knowledgeChunkModel.insertMany(createKnowledgeChunkDtos)
        return result && result.length > 0
    }
    async updateKnowledgeChunks(sourceId: string, isDeleteNeeded: boolean): Promise<boolean> {
        const res = await this.knowledgeChunkModel
            .updateMany({ source_id: sourceId }, { deleted_at: isDeleteNeeded ? new Date() : null })
            .exec()
        return res.modifiedCount > 0
    }
}
