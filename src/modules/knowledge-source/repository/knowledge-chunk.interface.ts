import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { KnowledgeChunk } from '../schemas/knowledge-chunk.schema'
import { CreateKnowledgeChunkDto } from '../dto/create-knowledge-chunk.dto'

export interface IKnowledgeChunkRepository extends BaseRepositoryInterface<KnowledgeChunk> {
    updateKnowledgeChunks(sourceId: string, isDeleteNeeded: boolean): Promise<boolean>
    upsertKnowledgeChunks(createKnowledgeChunkDtos: CreateKnowledgeChunkDto[]): Promise<boolean>
}
