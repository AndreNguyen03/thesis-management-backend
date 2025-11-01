import { Module } from '@nestjs/common'
import { CreateKnowledgeSourceProvider } from './application/create-knowledge-source.provider'
import { UpdateKnowledgeSourceProvider } from './application/update-knowledge-source.provider'
import { MongooseModule } from '@nestjs/mongoose'
import { KnowledgeSource, KnowledgeSourceSchema } from './schemas/knowledge-source.schema'
import { KnowledgeSourceRepository } from './repository/impl/knowledge-source.repository'
import { SearchSimilarDocumentsProvider } from './application/search-similar-documents.provider'
import { CreateSearchIndexerProvider } from './application/create-search-indexer.provider'
import { KnowledgeChunk, KnowledgeChunkSchema } from './schemas/knowledge-chunk.schema'
import { CreateKnowledgeChunksProvider } from './application/create-knowledge-chunks.provider'
import { KnowledgeChunkRepository } from './repository/impl/knowledge-chunk.repository'
import { UpdateKnowledgeChunkProvider } from './application/update-knowledge-chunk.provider'

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
        UpdateKnowledgeChunkProvider
    ],
    imports: [
        MongooseModule.forFeature([
            { name: KnowledgeSource.name, schema: KnowledgeSourceSchema },
            { name: KnowledgeChunk.name, schema: KnowledgeChunkSchema }
        ])
    ],
    exports: [
        CreateKnowledgeSourceProvider,
        UpdateKnowledgeSourceProvider,
        SearchSimilarDocumentsProvider,
        CreateSearchIndexerProvider,
        CreateKnowledgeChunksProvider,
        UpdateKnowledgeChunkProvider,
        'IKnowledgeChunkRepository',
        'IKnowledgeSourceRepository'
    ]
})
export class KnowledgeSourceModule {}
