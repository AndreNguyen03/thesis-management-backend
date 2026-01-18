import { Inject, Injectable } from '@nestjs/common'
import { IKnowledgeChunkRepository } from '../repository/knowledge-chunk.interface'

@Injectable()
export class UpdateKnowledgeChunkProvider {
    constructor(
        @Inject('IKnowledgeChunkRepository') private readonly knowledgeChunkRepository: IKnowledgeChunkRepository
    ) {}
    //name indexer default
    public async createKnowledgeChunks(sourceId: string, isDeleteNeeded: boolean) {
        return await this.knowledgeChunkRepository.updateKnowledgeChunks(sourceId, isDeleteNeeded)
    }
}
    