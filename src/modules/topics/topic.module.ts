import { forwardRef, Global, Module } from '@nestjs/common'
import { TopicController } from './topic.controller'
import { MongooseModule } from '@nestjs/mongoose'
import { UsersModule } from '../../users/users.module'
import { TopicService } from './application/topic.service'
import { TopicRepository, UserSavedTopicsRepository } from './repository'
import { Topic, TopicSchema } from './schemas/topic.schemas'
import { StudentRegisterTopic, StudentRegisterTopicSchema } from '../registrations/schemas/ref_students_topics.schemas'
import {
    LecturerRegisterTopic,
    LecturerRegisterTopicSchema
} from '../registrations/schemas/ref_lecturers_topics.schemas'
import { UserSavedTopics, UserSavedTopicsSchema } from './schemas/user_saved_topics.schemas'
import { RegistrationsModule } from '../registrations/registrations.module'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'
import { GetTopicProvider } from './providers/get-topic.provider'
import { GetTopicStatusProvider } from './providers/get-status-topic.provider'
import { TranferStatusAndAddPhaseHistoryProvider } from './providers/tranfer-status-and-add-phase-history.provider'
import { UpdateTopicsPhaseBatchProvider } from './providers/update-topics-batch.provider'
import { GetStatisticsTopicsProvider } from './providers/get-statistics-topics.provider'
import { UploadFilesModule } from '../upload-files/upload-files.module'
import { ValidateTopicStatusProvider } from './providers/validate-status.provider'
import { GetMiniTopicInfoProvider } from './providers/get-mini-topic-info.provider'
import { NotificationsModule } from '../notifications/notifications.module'
import { ConfigModule } from '@nestjs/config'
import { googleAIConfig } from '../../config/googleai.config'
import { mongoConfig } from '../../config/database.config'
import { PeriodsModule } from '../periods/periods.module'
import { GroupsModule } from '../groups/groups.module'
import { TopicInteractionModule } from '../topic_interaction/topic_interaction.module'
import { MilestoneTemplate, MilestoneTemplateSchema } from '../milestones/schemas/milestones-templates.schema'
import { MilestonesModule } from '../milestones/milestones.module'
@Global()
@Module({
    controllers: [TopicController],
    providers: [
        TopicService,
        {
            provide: 'TopicRepositoryInterface',
            useClass: TopicRepository
        },

        {
            provide: 'UserSavedTopicRepositoryInterface',
            useClass: UserSavedTopicsRepository
        },

        GetTopicProvider,

        GetTopicStatusProvider,

        TranferStatusAndAddPhaseHistoryProvider,

        UpdateTopicsPhaseBatchProvider,

        GetStatisticsTopicsProvider,
        ValidateTopicStatusProvider,
        GetMiniTopicInfoProvider
    ],
    exports: [
        TopicService,
        GetTopicProvider,
        GetTopicStatusProvider,
        'TopicRepositoryInterface',
        TranferStatusAndAddPhaseHistoryProvider,
        UpdateTopicsPhaseBatchProvider,
        GetStatisticsTopicsProvider,
        ValidateTopicStatusProvider,
        GetMiniTopicInfoProvider
    ],
    imports: [
        MongooseModule.forFeature([
            { name: Topic.name, schema: TopicSchema },
            { name: MilestoneTemplate.name, schema: MilestoneTemplateSchema },
            { name: StudentRegisterTopic.name, schema: StudentRegisterTopicSchema },
            { name: LecturerRegisterTopic.name, schema: LecturerRegisterTopicSchema },
            { name: UserSavedTopics.name, schema: UserSavedTopicsSchema },
        ]),
        ConfigModule.forFeature(googleAIConfig),
        ConfigModule.forFeature(mongoConfig),
        forwardRef(() => UsersModule),
        forwardRef(() => RegistrationsModule),
        forwardRef(() => PaginationAnModule),
        forwardRef(() => UploadFilesModule),
        forwardRef(() => NotificationsModule),
        forwardRef(() => PeriodsModule),
        forwardRef(() => GroupsModule),
        forwardRef(() => MilestonesModule),
        TopicInteractionModule
    ]
})
export class TopicModule {}
