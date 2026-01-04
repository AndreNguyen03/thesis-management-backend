import { Module } from '@nestjs/common'
import { RecommendController } from './recommend.controller'
import { GetEmbeddingProvider } from '../chatbot/application/get-embedding.provider'
import { UsersModule } from '../../users/users.module'
import { TopicModule } from '../topics/topic.module'
import { FieldsModule } from '../fields/fields.module'
import { ChatBotModule } from '../chatbot/chatbot.module'
import { RequirementsModule } from '../requirements/requirements.module'
import { TopicInteractionModule } from '../topic_interaction/topic_interaction.module'
import { RecommendationService } from './application/recommend.service'
import { ContentBasedPipeline } from './pipelines/content-based-v2.pipeline'
import { PopularityBasedPipeline } from './pipelines/popularity.pipeline'
import { Reranker } from './pipelines/rerank.pipeline'
import { ConfigModule } from '@nestjs/config'
import { googleAIConfig } from '../../config/googleai.config'
import { RedisModule } from '../../redis/redis.module'
import { StudentSummaryBuilderService } from './services/student-summary-builder.service'
import { AdaptiveWeightsService } from './services/adaptive-weights.service'
import { TopicEnhancerService } from './services/topic-enhancer.service'
import { DynamicThresholdService } from './services/dynamic-threshold.service'
import { RerankerService } from './services/reranker.service'
import { TopicVectorModule } from '../topic_search/topic_search.module'
import { KnowledgeSourceModule } from '../knowledge-source/knowledge-source.module'

@Module({
    imports: [
        UsersModule,
        TopicModule,
        FieldsModule,
        ChatBotModule,
        RequirementsModule,
        TopicInteractionModule,
        ConfigModule.forFeature(googleAIConfig),
        RedisModule,
        TopicVectorModule,
        KnowledgeSourceModule
    ],
    providers: [
        RecommendationService,
        ContentBasedPipeline, // ✅ Add this
        PopularityBasedPipeline,
        GetEmbeddingProvider,
        Reranker,
        StudentSummaryBuilderService,
        AdaptiveWeightsService,
        RerankerService,
        TopicEnhancerService,
        DynamicThresholdService
    ],
    controllers: [RecommendController]
})
export class RecommendModule {}
