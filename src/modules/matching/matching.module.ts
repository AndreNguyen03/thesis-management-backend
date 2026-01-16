import { forwardRef, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Concept, ConceptSchema } from './schemas/concept.schema'
import { Student, StudentSchema } from '../../users/schemas/student.schema'
import { ConceptMatcherService } from './services/concept-matcher.service'
import { StudentConceptInferenceService } from './services/student-concept-inference.service'
import { ConceptInferenceController } from './controllers/concept-inference.controller'
import { ChatBotModule } from '../chatbot/chatbot.module'

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Concept.name, schema: ConceptSchema },
            { name: Student.name, schema: StudentSchema }
        ]),
        forwardRef(() => ChatBotModule)
    ],
    controllers: [ConceptInferenceController],
    providers: [ConceptMatcherService, StudentConceptInferenceService],
    exports: [ConceptMatcherService, StudentConceptInferenceService]
})
export class MatchingModule {}
