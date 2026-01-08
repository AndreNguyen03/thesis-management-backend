import { forwardRef, Module } from '@nestjs/common'
import { CreateKnowledgeSourceProvider } from './application/create-knowledge-source.provider'
import { UpdateKnowledgeSourceProvider } from './application/update-knowledge-source.provider'
import { MongooseModule } from '@nestjs/mongoose'
import { KnowledgeSource, KnowledgeSourceSchema } from './schemas/knowledge-source.schema'
import { KnowledgeSourceRepository } from './repository/impl/knowledge-source.repository'
import { SearchSimilarTopicsProvider } from './application/search-similar-topics.provider'
import { CreateSearchIndexerProvider } from './application/create-search-indexer.provider'
import { KnowledgeChunk, KnowledgeChunkSchema } from './schemas/knowledge-chunk.schema'
import { CreateKnowledgeChunksProvider } from './application/create-knowledge-chunks.provider'
import { KnowledgeChunkRepository } from './repository/impl/knowledge-chunk.repository'
import { UpdateKnowledgeChunkProvider } from './application/update-knowledge-chunk.provider'
import { ConfigModule } from '@nestjs/config'
import { googleAIConfig } from '../../config/googleai.config'
import { ChatBotModule } from '../chatbot/chatbot.module'
import { KnowledgeSourceController } from './knowledge-source.controller'
import { KnowledgeSourceService } from './application/knowledge-source.service'
import { PaginationModule } from '../../common/pagination/pagination.module'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'
import { SearchSimilarDocumentsProvider } from './application/search-similar-documents.provider copy'
import { TopicVector, TopicVectorSchema } from '../topic_search/schemas/topic-vector.schemas'
import { TopicModule } from '../topics/topic.module'

@Module({
    providers: [
        CreateKnowledgeSourceProvider,
        UpdateKnowledgeSourceProvider,
        {
            provide: 'IKnowledgeSourceRepository',
            useClass: KnowledgeSourceRepository
        },
        {
            provide: 'IKnowledgeChunkRepository',
            useClass: KnowledgeChunkRepository
        },
        SearchSimilarDocumentsProvider,
        CreateSearchIndexerProvider,
        CreateKnowledgeChunksProvider,
        SearchSimilarTopicsProvider,
        UpdateKnowledgeChunkProvider,
        KnowledgeSourceService
    ],
    imports: [
        MongooseModule.forFeature([
            { name: KnowledgeSource.name, schema: KnowledgeSourceSchema },
            { name: KnowledgeChunk.name, schema: KnowledgeChunkSchema },
            { name: TopicVector.name, schema: TopicVectorSchema }

        ]),
        ConfigModule.forFeature(googleAIConfig),
        forwardRef(() => ChatBotModule),
        PaginationModule,
        PaginationAnModule,
        TopicModule,
    ],
    exports: [
        CreateKnowledgeSourceProvider,
        UpdateKnowledgeSourceProvider,
        SearchSimilarDocumentsProvider,
        SearchSimilarTopicsProvider,
        CreateSearchIndexerProvider,
        CreateKnowledgeChunksProvider,
        UpdateKnowledgeChunkProvider,
        'IKnowledgeChunkRepository',
        'IKnowledgeSourceRepository'
    ],
    controllers: [KnowledgeSourceController]
})
export class KnowledgeSourceModule {}
