import { forwardRef, Module } from '@nestjs/common'
import { StudentRegTopicService } from './application/student-reg-topic.service'
import { LecturerRegTopicService } from './application/lecturer-reg-topic.service'
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose'
import { RegistrationsController } from './registrations.controller'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'
import { GetRegistrationInTopicProvider } from './provider/get-registration-in-topic.provider'
import { TopicModule } from '../topics/topic.module'
import { Connection } from 'mongoose'

import { NotificationsModule } from '../notifications/notifications.module'
import { GetTopicIdsProvider } from './provider/get-topic-ids-stu.provider'
import { UsersModule } from '../../users/users.module'
import { StudentRegTopicRepository } from '../topics/repository'
import { LecturerRegTopicRepository } from './repository/impl/lecturer_reg_topic.repository'
import { StudentRegisterTopic, StudentRegisterTopicSchema } from './schemas/ref_students_topics.schemas'
import { LecturerRegisterTopic, LecturerRegisterTopicSchema } from './schemas/ref_lecturers_topics.schemas'
import { Topic, TopicSchema } from '../topics/schemas/topic.schemas'
import { PeriodsModule } from '../periods/periods.module'
@Module({
    controllers: [RegistrationsController],
    providers: [
        StudentRegTopicService,
        LecturerRegTopicService,
        GetRegistrationInTopicProvider,
        { provide: 'StudentRegTopicRepositoryInterface', useClass: StudentRegTopicRepository },
        { provide: 'LecturerRegTopicRepositoryInterface', useClass: LecturerRegTopicRepository },
        {
            provide: Connection,
            useFactory: (connection: Connection) => connection,
            inject: [getConnectionToken()]
        },
        GetTopicIdsProvider
    ],
    imports: [
        PaginationAnModule,
        forwardRef(() => TopicModule),
        forwardRef(() => UsersModule),
        forwardRef(() => NotificationsModule),
        forwardRef(() => PeriodsModule),
        MongooseModule.forFeature([
            { name: StudentRegisterTopic.name, schema: StudentRegisterTopicSchema },
            { name: LecturerRegisterTopic.name, schema: LecturerRegisterTopicSchema },
            { name: Topic.name, schema: TopicSchema }
        ]),
        PaginationAnModule,
        
    ],
    exports: [StudentRegTopicService, LecturerRegTopicService, GetRegistrationInTopicProvider, GetTopicIdsProvider]
})
export class RegistrationsModule {}
