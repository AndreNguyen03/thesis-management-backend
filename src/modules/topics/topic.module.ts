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
import { RegistrationsModule } from '../registrations/registerations.module'
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
        }
    ],
    exports: [TopicService],
    imports: [
        forwardRef(() => TopicModule),
        MongooseModule.forFeature([
            { name: Topic.name, schema: TopicSchema },
            { name: StudentRegisterTopic.name, schema: StudentRegisterTopicSchema },
            { name: LecturerRegisterTopic.name, schema: LecturerRegisterTopicSchema },
            { name: UserSavedTopics.name, schema: UserSavedTopicsSchema }
        ]),
        forwardRef(() => UsersModule),
        RegistrationsModule
    ]
})
export class TopicModule {}
