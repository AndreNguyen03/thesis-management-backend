import { Module } from '@nestjs/common'
import { StudentRegTopicService } from './application/student-reg-topic.service'
import { LecturerRegTopicService } from './application/lecturer-reg-topic.service'
import { MongooseModule } from '@nestjs/mongoose'
import { StudentRegisterTopic, StudentRegisterTopicSchema } from './schemas/ref_students_topics.schemas'
import { StudentRegTopicRepository } from '../topics/repository'
import { LecturerRegTopicRepository } from './repository/impl/lecturer_reg_topic.repository'
import { LecturerRegisterTopic, LecturerRegisterTopicSchema } from './schemas/ref_lecturers_topics.schemas'
import { Topic, TopicSchema } from '../topics/schemas/topic.schemas'
import { RegistrationsController } from './registrations.controller'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'
@Module({
    controllers: [RegistrationsController],
    providers: [
        StudentRegTopicService,
        LecturerRegTopicService,
        {
            provide: 'StudentRegTopicRepositoryInterface',
            useClass: StudentRegTopicRepository
        },
        {
            provide: 'LecturerRegTopicRepositoryInterface',
            useClass: LecturerRegTopicRepository
        }
    ],
    imports: [
        MongooseModule.forFeature([
            { name: StudentRegisterTopic.name, schema: StudentRegisterTopicSchema },
            { name: LecturerRegisterTopic.name, schema: LecturerRegisterTopicSchema },
            { name: Topic.name, schema: TopicSchema }
        ]),
        PaginationAnModule
    ],
    exports: [
        StudentRegTopicService,
        LecturerRegTopicService,
        'LecturerRegTopicRepositoryInterface',
        'StudentRegTopicRepositoryInterface'
    ]
})
export class RegistrationsModule {}
