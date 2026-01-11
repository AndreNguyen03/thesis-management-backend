import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BullModule } from '@nestjs/bull'

import { ChatController } from './chatbot.controller'
import { ChatBotService } from './application/chatbot.service'
import { MongooseModule } from '@nestjs/mongoose'
import { ChatBot, ChatBotSchema } from './schemas/chatbot.schemas'
import { GetEmbeddingProvider } from './providers/get-embedding.provider'
import { KnowledgeSourceModule } from '../knowledge-source/knowledge-source.module'
import { RetrievalProvider } from './providers/retrieval.provider'
import { GenerationProvider } from './providers/generation.provider'
import { ChatBotRepository } from './repository/impl/chatbot.repository'
import { ChatbotVersion, ChatBotVersionSchema } from './schemas/chatbot_version.schemas'
import { KnowledgeChunk, KnowledgeChunkSchema } from '../knowledge-source/schemas/knowledge-chunk.schema'
import { googleAIConfig } from '../../config/googleai.config'
import { KnowledgeProcessingProcessor } from './processors/knowledge-processing.processor'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'
import { TopicModule } from '../topics/topic.module'
import { AutoAgentService } from './application/auto-agent.service'
import { TopicSearchTool } from './tools/topic-search.tool'
import { DocumentSearchTool } from './tools/document-search.tool'
import { LecturerSearchTool } from './tools/lecturer-search.tool'
import { KnowledgeSource, KnowledgeSourceSchema } from '../knowledge-source/schemas/knowledge-source.schema'
import { AutoAgentController } from './auto-agent.controller'
import { ChatbotConversationController } from './chatbot-conversation.controller'
import { ChatbotConversationService } from './application/chatbot-conversation.service'
import { ChatbotConversationRepository } from './repository/chatbot-conversation.repository'
import { ChatbotConversation, ChatbotConversationSchema } from './schemas/chatbot-conversation.schema'
import { Lecturer, LecturerSchema } from '../../users/schemas/lecturer.schema'
import { User, UserSchema } from '../../users/schemas/users.schema'
import { FieldsModule } from '../fields/fields.module'
import { RequirementsModule } from '../requirements/requirements.module'
import { TopicGenerationService } from './application/topic-generation.service'

@Module({
    controllers: [ChatController, AutoAgentController, ChatbotConversationController],
    providers: [
        ChatBotService,
        GetEmbeddingProvider,
        RetrievalProvider,
        GenerationProvider,
        {
            provide: 'ChatBotRepositoryInterface',
            useClass: ChatBotRepository
        },
        KnowledgeProcessingProcessor,
        AutoAgentService,
        TopicSearchTool,
        DocumentSearchTool,
        LecturerSearchTool,
        ChatbotConversationService,
        ChatbotConversationRepository,
        TopicGenerationService
    ],
    imports: [
        ConfigModule.forFeature(googleAIConfig),
        MongooseModule.forFeature([
            { name: ChatBot.name, schema: ChatBotSchema },
            { name: ChatbotVersion.name, schema: ChatBotVersionSchema },
            { name: KnowledgeChunk.name, schema: KnowledgeChunkSchema },
            { name: KnowledgeSource.name, schema: KnowledgeSourceSchema },
            { name: ChatbotConversation.name, schema: ChatbotConversationSchema },
            { name: Lecturer.name, schema: LecturerSchema },
            { name: User.name, schema: UserSchema },

        ]),
        forwardRef(() => KnowledgeSourceModule),
        forwardRef(() => FieldsModule),
        forwardRef(() => RequirementsModule),
        BullModule.registerQueue({ name: 'knowledge-processing' }),
        PaginationAnModule,
        TopicModule
    ],
    exports: [ChatBotService, GetEmbeddingProvider, RetrievalProvider, GenerationProvider]
})
export class ChatBotModule {}
