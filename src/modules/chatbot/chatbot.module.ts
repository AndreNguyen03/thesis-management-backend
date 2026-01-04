import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BullModule } from '@nestjs/bull'

import { ChatController } from './chatbot.controller'
import { ChatBotService } from './application/chatbot.service'
import { MongooseModule } from '@nestjs/mongoose'
import { ChatBot, ChatBotSchema } from './schemas/chatbot.schemas'
import { GetEmbeddingProvider } from './application/get-embedding.provider'
import { KnowledgeSourceModule } from '../knowledge-source/knowledge-source.module'
import { RetrievalProvider } from './application/retrieval.provider'
import { GenerationProvider } from './application/generation.provider'
import { ChatBotRepository } from './repository/impl/chatbot.repository'
import { ChatbotVersion, ChatBotVersionSchema } from './schemas/chatbot_version.schemas'
import { KnowledgeChunk, KnowledgeChunkSchema } from '../knowledge-source/schemas/knowledge-chunk.schema'
import { googleAIConfig } from '../../config/googleai.config'
import { KnowledgeProcessingProcessor } from './processors/knowledge-processing.processor'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'

@Module({
    controllers: [ChatController],
    providers: [
        ChatBotService,
        GetEmbeddingProvider,
        RetrievalProvider,
        GenerationProvider,
        {
            provide: 'ChatBotRepositoryInterface',
            useClass: ChatBotRepository
        },
        KnowledgeProcessingProcessor
    ],
    imports: [
        ConfigModule.forFeature(googleAIConfig),
        MongooseModule.forFeature([
            { name: ChatBot.name, schema: ChatBotSchema },
            { name: ChatbotVersion.name, schema: ChatBotVersionSchema },
            { name: KnowledgeChunk.name, schema: KnowledgeChunkSchema },
            
        ]),
        forwardRef(() => KnowledgeSourceModule),
        BullModule.registerQueue({ name: 'knowledge-processing' }),
        PaginationAnModule
    ],
    exports: [ChatBotService, GetEmbeddingProvider]
})
export class ChatBotModule {}
