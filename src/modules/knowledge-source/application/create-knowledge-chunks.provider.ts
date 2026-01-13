import { Inject, Injectable } from '@nestjs/common'
import { CreateSearchIndexerProvider } from './create-search-indexer.provider'
import { IKnowledgeChunkRepository } from '../repository/knowledge-chunk.interface'
import { CreateKnowledgeChunkDto } from '../dto/create-knowledge-chunk.dto'

@Injectable()
export class CreateKnowledgeChunksProvider {
    constructor(
        @Inject('IKnowledgeChunkRepository') private readonly knowledgeChunkRepository: IKnowledgeChunkRepository
    ) {}

    public async createKnowledgeChunks(createKnowledgeChunkDtos: CreateKnowledgeChunkDto[]): Promise<boolean> {
        //Create indexer when create knowledge chunks
        //Check if indexer exists and create if not exists
        try {
            return await this.knowledgeChunkRepository.upsertSingleKnowledgeChunk(createKnowledgeChunkDtos)
        } catch (error) {
            console.error('Error creating knowledge chunks:', error)
            throw error
        }
    }
    public async insertKnowledgeChunks(createKnowledgeChunkDtos: CreateKnowledgeChunkDto[]): Promise<boolean> {
        //Create indexer when create knowledge chunks
        //Check if indexer exists and create if not exists
        try {
            return await this.knowledgeChunkRepository.insertManyKnowledgeChunks(createKnowledgeChunkDtos)
        } catch (error) {
            console.error('Error inserting knowledge chunks:', error)
            throw error
        }
    }
}
