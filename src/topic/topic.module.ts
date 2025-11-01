import { forwardRef, Module } from '@nestjs/common'
import { TopicController } from './topic.controller'
import { TopicRepository } from './repository/impl/topic.repository'
import { TopicService } from './application/topic.service'
import { MongooseModule } from '@nestjs/mongoose'
import { Topic, TopicSchema } from './schemas/topic.schemas'
import { StudentRepository } from '../users/repository/impl/student.repository'
import { StudentService } from '../users/application/student.service'
import { Student, StudentSchema } from '../users/schemas/student.schema'
import { Lecturer, LecturerSchema } from '../users/schemas/lecturer.schema'
import { UsersModule } from '../users/users.module'
import { RegistrationRepository } from './repository/impl/registration.repository'
import { Registration, RegistrationSchema } from './schemas/registration.schema'
import { Archive, ArchiveSchema } from './schemas/archive.schemas'
import { ArchiveRepository } from './repository/impl/archive.repository'
@Module({
    controllers: [TopicController],
    providers: [
        TopicService,
        {
            provide: 'TopicRepositoryInterface',
            useClass: TopicRepository
        },
        {
            provide: 'StudentRepositoryInterface',
            useClass: StudentRepository
        },
        {
            provide: 'RegistrationRepositoryInterface',
            useClass: RegistrationRepository
        },
        {
            provide: 'ArchiveRepositoryInterface',
            useClass: ArchiveRepository
        }
    ],
    exports: [TopicService],
    imports: [
        forwardRef(() => TopicModule),
        MongooseModule.forFeature([
            { name: Topic.name, schema: TopicSchema },
            { name: Registration.name, schema: RegistrationSchema },
            { name: Archive.name, schema: ArchiveSchema }
        ]),
        forwardRef(() => UsersModule)
    ]
})
export class TopicModule {}
