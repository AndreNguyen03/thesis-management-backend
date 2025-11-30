import { forwardRef, Module } from '@nestjs/common'
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
import { CheckAllowManualApprovalProvider } from './providers/check-allow-manual-approval.provider';

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
        CheckAllowManualApprovalProvider
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
        CheckAllowManualApprovalProvider
    ],
    imports: [
        forwardRef(() => TopicModule),
        MongooseModule.forFeature([
            { name: Topic.name, schema: TopicSchema },
            { name: StudentRegisterTopic.name, schema: StudentRegisterTopicSchema },
            { name: LecturerRegisterTopic.name, schema: LecturerRegisterTopicSchema },
            { name: UserSavedTopics.name, schema: UserSavedTopicsSchema }
        ]),
        forwardRef(() => UsersModule),
        RegistrationsModule,
        PaginationAnModule,
        UploadFilesModule,
    ]
})
export class TopicModule {}
