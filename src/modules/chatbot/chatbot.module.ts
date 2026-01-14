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
import { TopicRegisteringSearchTool } from './tools/topic-registering-search.tool'
import { TopicInLibrarySearchTool } from './tools/topic-in-library-search.tool'
import { PeriodsModule } from '../periods/periods.module'
import { UploadFilesModule } from '../upload-files/upload-files.module'
import { ChatbotGateway } from './gateways/chatbot.gateway'
import { Student, StudentSchema } from '../../users/schemas/student.schema'
import { ProfileMatchingTool } from './tools/profile-matching.tool'

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
        TopicRegisteringSearchTool,
        TopicInLibrarySearchTool,
        DocumentSearchTool,
        LecturerSearchTool,
        ProfileMatchingTool,
        ChatbotConversationService,
        ChatbotConversationRepository,
        TopicGenerationService,
        ChatbotGateway
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
            { name: Student.name, schema: StudentSchema }
        ]),
        forwardRef(() => KnowledgeSourceModule),
        forwardRef(() => FieldsModule),
        forwardRef(() => RequirementsModule),
        BullModule.registerQueue({ name: 'knowledge-processing' }),
        PaginationAnModule,
        forwardRef(() => TopicModule),
        forwardRef(() => PeriodsModule),
        forwardRef(() => UploadFilesModule)
    ],
    exports: [ChatBotService, GetEmbeddingProvider, RetrievalProvider, GenerationProvider, ChatbotGateway]
})
export class ChatBotModule {}
