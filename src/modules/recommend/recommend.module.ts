import { Module } from '@nestjs/common'
import { RecommendController } from './recommend.controller'
import { TopicService } from '../topics/application/topic.service'
import { FieldsService } from '../fields/application/fields.service'
import { GetEmbeddingProvider } from '../chatbot/application/get-embedding.provider'
import { RequirementsService } from '../requirements/application/requirements.service'
import { StudentService } from '../../users/application/student.service'
import { UsersModule } from '../../users/users.module'
import { TopicModule } from '../topics/topic.module'
import { FieldsModule } from '../fields/fields.module'
import { ChatBotModule } from '../chatbot/chatbot.module'
import { RequirementsModule } from '../requirements/requirements.module'
import { TopicInteractionModule } from '../topic_interaction/topic_interaction.module'
import { RecommendService } from './application/recommend.service'
import { ContentBasedPipeline } from './pipelines/content-based.pipeline'
import { PopularityBasedPipeline } from './pipelines/popularity.pipeline'
import { BadgeGenerator } from './pipelines/badge-generator'
import { Reranker } from './pipelines/rerank.pipeline'
import { ConfigModule } from '@nestjs/config'
import { googleAIConfig } from '../../config/googleai.config'

@Module({
    imports: [
        UsersModule,
        TopicModule,
        FieldsModule,
        ChatBotModule,
        RequirementsModule,
        TopicInteractionModule,
        ConfigModule.forFeature(googleAIConfig)
    ],
    providers: [
        RecommendService,
        ContentBasedPipeline, // ✅ Add this
        PopularityBasedPipeline,
        GetEmbeddingProvider,
        Reranker,
        BadgeGenerator
    ],
    controllers: [RecommendController]
})
export class RecommendModule {}
