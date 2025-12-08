import { Inject, Injectable } from '@nestjs/common'
import { CreateKnowledgeSourceDto } from '../dto/create-knowledge-source.dto'
import { IKnowledgeSourceRepository } from '../repository/knowledge-source.interface'
import { CreateSearchIndexerProvider } from './create-search-indexer.provider'
import { KnowledgeSource } from '../schemas/knowledge-source.schema'

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
        await this.createSearchIndexerProvider.createSearchIndexer(this.DEFAULT_INDEXER_NAME)
        console.log('Created knowledge source:', knowledgeSource._id)
        return knowledgeSource
    }
}
