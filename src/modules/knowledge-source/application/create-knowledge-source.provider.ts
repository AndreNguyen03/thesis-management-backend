import { Inject, Injectable } from '@nestjs/common'
import { CreateKnowledgeSourceDto } from '../dto/create-knowledge-source.dto'
import { IKnowledgeSourceRepository } from '../repository/knowledge-source.interface'
import { CreateSearchIndexerProvider } from './create-search-indexer.provider'
import { KnowledgeSource } from '../schemas/knowledge-source.schema'

@Injectable()
export class CreateKnowledgeSourceProvider {
    constructor(
        @Inject('IKnowledgeSourceRepository') private readonly knowledgeSourceRepository: IKnowledgeSourceRepository
    ) {}

    public async createKnowledgeSource(createKnowledgeSourceDto: CreateKnowledgeSourceDto): Promise<KnowledgeSource> {
        // Logic to create a knowledge source
        const knowledgeSource = await this.knowledgeSourceRepository.create(createKnowledgeSourceDto)
        return knowledgeSource
    }
}
