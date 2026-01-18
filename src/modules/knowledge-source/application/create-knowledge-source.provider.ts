import { Inject, Injectable } from '@nestjs/common'
import { CreateKnowledgeSourceDto } from '../dto/create-knowledge-source.dto'
import { IKnowledgeSourceRepository } from '../repository/knowledge-source.interface'
import { CreateSearchIndexerProvider } from './create-search-indexer.provider'
import { KnowledgeSource } from '../schemas/knowledge-source.schema'
import mongoose from 'mongoose'

@Injectable()
export class CreateKnowledgeSourceProvider {
    constructor(
        private readonly createSearchIndexerProvider: CreateSearchIndexerProvider,
        @Inject('IKnowledgeSourceRepository') private readonly knowledgeSourceRepository: IKnowledgeSourceRepository
    ) {}
    //name indexer default
    private readonly DEFAULT_INDEXER_NAME = 'search_knowledge_chunk'
    public async createKnowledgeSource(
        userId: string,
        createKnowledgeSourceDto: CreateKnowledgeSourceDto
    ): Promise<KnowledgeSource> {
        // Logic to create a knowledge source
        const knowledgeSource = await this.knowledgeSourceRepository.create({
            ...createKnowledgeSourceDto,
            owner: userId
        })
        await this.createSearchIndexerProvider.createSearchKnowledgeIndexer(
            this.DEFAULT_INDEXER_NAME,
            'plot_embedding_gemini_large'
        )
        console.log('Created knowledge source:', knowledgeSource._id)
        return knowledgeSource
    }

    public async getKnowledgeSourceById(knowledgeSourceId: string): Promise<KnowledgeSource | null> {
        return await this.knowledgeSourceRepository.findOneById(knowledgeSourceId)
    }

    public async updateKnowledgeSourceStatus(knowledgeSourceId: string, status: any): Promise<KnowledgeSource | null> {
        console.log('Updating knowledge source status:', { knowledgeSourceId, status })
        return await this.knowledgeSourceRepository.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(knowledgeSourceId) },
            { processing_status: status }
        )
    }

    public async updateKnowledgeSourceMetadata(
        knowledgeSourceId: string,
        metadata: any
    ): Promise<KnowledgeSource | null> {
        return await this.knowledgeSourceRepository.findOneKLAndUpdate(knowledgeSourceId, metadata)
    }

    public async updateKnowledgeSourceLocation(
        knowledgeSourceId: string,
        url: string
    ): Promise<KnowledgeSource | null> {
        return await this.knowledgeSourceRepository.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(knowledgeSourceId) },
            { source_location: url }
        )
    }
}
