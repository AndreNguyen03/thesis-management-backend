import { Module, forwardRef } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { MatchingService } from './application/matching.service'
import { MatchingController } from './matching.controller'
import { ProfileMatchingProvider } from './providers/profile-matching.provider'
import { ChatBotModule } from '../chatbot/chatbot.module'
import { UsersModule } from '../../users/users.module'
import { Student, StudentSchema } from '../../users/schemas/student.schema'
import { Lecturer, LecturerSchema } from '../../users/schemas/lecturer.schema'
import { User, UserSchema } from '../../users/schemas/users.schema'
import { Concept, ConceptSchema } from './schemas/concept.schema'
import { ConceptCandidate, ConceptCandidateSchema } from './schemas/concept-candidate.schema'
import { ConceptEvolutionService } from './application/concept-evolution.service'
import { ConceptDetectionJob } from './application/concept-detection.job'
import { ConceptAdminController } from './concept-admin.controller'
import groqConfig from '../../config/groq.config'

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Concept.name, schema: ConceptSchema },
            { name: ConceptCandidate.name, schema: ConceptCandidateSchema },
            { name: Student.name, schema: StudentSchema },
            { name: Lecturer.name, schema: LecturerSchema },
            { name: User.name, schema: UserSchema }
        ]),
        ConfigModule.forFeature(groqConfig),
        ScheduleModule.forRoot(),
        forwardRef(() => ChatBotModule),
        UsersModule
    ],
    controllers: [MatchingController, ConceptAdminController],
    providers: [MatchingService, ProfileMatchingProvider, ConceptEvolutionService, ConceptDetectionJob],
    exports: [MatchingService, ProfileMatchingProvider]
})
export class MatchingModule {}
