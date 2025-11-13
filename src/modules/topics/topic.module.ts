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
import { RefFieldsTopicsModule } from '../ref_fields_topics/ref_fields_topics.module'
import { RefRequirementsTopicsModule } from '../ref_requirements_topics/ref_requirements_topics.module'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'
import { GetTopicProvider } from './providers/get-topic.provider'
import { GetTopicStatusProvider } from './providers/get-status-topic.provider'
import { TranferStatusAndAddPhaseHistoryProvider } from './providers/tranfer-status-and-add-phase-history.provider'

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

        TranferStatusAndAddPhaseHistoryProvider
    ],
    exports: [TopicService, GetTopicProvider, GetTopicStatusProvider, 'TopicRepositoryInterface',TranferStatusAndAddPhaseHistoryProvider],
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
        RefFieldsTopicsModule,
        RefRequirementsTopicsModule,
        RegistrationsModule,
        PaginationAnModule
    ]
})
export class TopicModule {}
