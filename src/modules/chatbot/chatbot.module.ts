import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
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
import voyageConfig from '../../auth/config/voyage.config'
import { CreateKnowledgeChunksProvider } from '../knowledge-source/application/create-knowledge-chunks.provider'
import { CreateKnowledgeSourceProvider } from '../knowledge-source/application/create-knowledge-source.provider'
import { SearchSimilarDocumentsProvider } from '../knowledge-source/application/search-similar-documents.provider'
import { KnowledgeChunk, KnowledgeChunkSchema } from '../knowledge-source/schemas/knowledge-chunk.schema'

@Module({
    controllers: [ChatController],
    providers: [
        ChatBotService,
        GetEmbeddingProvider,
        RetrievalProvider,
        GenerationProvider,
        CreateKnowledgeChunksProvider,
        CreateKnowledgeSourceProvider,
        SearchSimilarDocumentsProvider,
        {
            provide: 'ChatBotRepositoryInterface',
            useClass: ChatBotRepository
        }
    ],
    imports: [
        ConfigModule.forFeature(voyageConfig),
        MongooseModule.forFeature([
            { name: ChatBot.name, schema: ChatBotSchema },
            { name: ChatbotVersion.name, schema: ChatBotVersionSchema },
            { name: KnowledgeChunk.name, schema: KnowledgeChunkSchema }
        ]),
        KnowledgeSourceModule
    ],
    exports: [ChatBotService]
})
export class ChatBotModule {}
