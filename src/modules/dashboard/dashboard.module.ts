import { forwardRef, Module } from '@nestjs/common'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './application/dashboard.service'
import { TopicModule } from '../topics/topic.module'
import { MongooseModule } from '@nestjs/mongoose'
import { Topic, TopicSchema } from '../topics/schemas/topic.schemas'
import { StudentRegisterTopic, StudentRegisterTopicSchema } from '../registrations/schemas/ref_students_topics.schemas'
import {
    LecturerRegisterTopic,
    LecturerRegisterTopicSchema
} from '../registrations/schemas/ref_lecturers_topics.schemas'
import { CompletionPhaseProvider } from './provider/completion-phase.provider'
import { ExecutionPhaseProvider } from './provider/execution-phase.provider'
import { RegistrationPhaseProvider } from './provider/registration-phase.provider'
import { SubmitPhaseProvider } from './provider/submit-phase.provider'
import { PeriodsModule } from '../periods/periods.module'

@Module({
    controllers: [DashboardController],
    providers: [
        DashboardService,
        CompletionPhaseProvider,
        ExecutionPhaseProvider,
        RegistrationPhaseProvider,
        SubmitPhaseProvider
    ],
    imports: [
        TopicModule,
        MongooseModule.forFeature([
            { name: Topic.name, schema: TopicSchema },
            { name: StudentRegisterTopic.name, schema: StudentRegisterTopicSchema },
            { name: LecturerRegisterTopic.name, schema: LecturerRegisterTopicSchema }
        ]),
        PeriodsModule
    ]
})
export class DashboardModule {}
