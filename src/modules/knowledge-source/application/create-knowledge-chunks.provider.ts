import { Inject, Injectable } from '@nestjs/common'
import { CreateSearchIndexerProvider } from './create-search-indexer.provider'
import { IKnowledgeChunkRepository } from '../repository/knowledge-chunk.interface'
import { CreateKnowledgeChunkDto } from '../dto/create-knowledge-chunk.dto'

@Injectable()
export class CreateKnowledgeChunksProvider {
    constructor(
        private readonly createSearchIndexerProvider: CreateSearchIndexerProvider,
        @Inject("IKnowledgeChunkRepository") private readonly knowledgeChunkRepository: IKnowledgeChunkRepository
    ) {}
    //name indexer default
    private readonly DEFAULT_INDEXER_NAME = 'vector_indexer'
    public async createKnowledgeChunks(createKnowledgeChunkDtos: CreateKnowledgeChunkDto) {
        //Create indexer when create knowledge chunks
        //Check if indexer exists and create if not exists
        await this.createSearchIndexerProvider.createSearchIndexer(this.DEFAULT_INDEXER_NAME)
        await this.knowledgeChunkRepository.createManyKnowledgeChunks(createKnowledgeChunkDtos)
    }
}
