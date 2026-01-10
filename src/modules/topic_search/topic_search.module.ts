import { forwardRef, Module } from '@nestjs/common'
import { TopicSearchController } from './topic_search.controller'
import { MongooseModule } from '@nestjs/mongoose'
import { ConfigModule } from '@nestjs/config'
import { googleAIConfig } from '../../config/googleai.config'
import { TopicSearchService } from './application/search.service'
import { CreateSearchIndexProvider } from './provider/create-search-index.provider'
import { VectorSyncProcessor } from './provider/vector-sync.processor'
import { TopicVector, TopicVectorSchema } from './schemas/topic-vector.schemas'
import { PeriodsModule } from '../periods/periods.module'
import { BullModule } from '@nestjs/bull'
import { VectorSyncProvider } from './provider/vector-sync.provider'
import { TopicVectorRepository } from './repository/impl/topic-vector.repository'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'
import { TopicModule } from '../topics/topic.module'
import { KnowledgeChunk, KnowledgeChunkSchema } from '../knowledge-source/schemas/knowledge-chunk.schema'

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: TopicVector.name, schema: TopicVectorSchema },
            { name: KnowledgeChunk.name, schema: KnowledgeChunkSchema }
        ]),
        ConfigModule.forFeature(googleAIConfig),
        forwardRef(() => PeriodsModule),
        BullModule.registerQueue({ name: 'vector-sync-queue' }),
        PaginationAnModule,
        forwardRef(() => TopicModule)
    ],
    controllers: [TopicSearchController],
    providers: [
        TopicSearchService,
        CreateSearchIndexProvider,
        VectorSyncProcessor,
        VectorSyncProvider,
        {
            provide: 'TopicVectorRepositoryInterface',
            useClass: TopicVectorRepository
        }
    ],
    exports: [TopicSearchService, VectorSyncProvider]
})
export class TopicVectorModule {}
