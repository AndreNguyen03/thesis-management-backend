import { Module, forwardRef } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ConfigModule } from '@nestjs/config'

// Schemas
import { Concept, ConceptSchema } from './schemas/concept.schema'
import { Student, StudentSchema } from '../../users/schemas/student.schema'
import { Lecturer, LecturerSchema } from '../../users/schemas/lecturer.schema'
import { User, UserSchema } from '../../users/schemas/users.schema'
import { KnowledgeChunk, KnowledgeChunkSchema } from '../knowledge-source/schemas/knowledge-chunk.schema'
import { KnowledgeSource, KnowledgeSourceSchema } from '../knowledge-source/schemas/knowledge-source.schema'

// Services
import { ConceptSeederService } from './services/concept-seeder.service'
import { ConceptSyncService } from './services/concept-sync.service'
import { StudentOntologyService } from './services/student-ontology.service'
import { LecturerOntologyService } from './services/lecturer-ontology.service'
import { MatchingService } from './services/matching.service'

// Controllers
import { ConceptController } from './controllers/concept.controller'
import { StudentOntologyController } from './controllers/student-ontology.controller'
import { LecturerOntologyController } from './controllers/lecturer-ontology.controller'
import { MatchingController } from './controllers/matching.controller'

// Import ChatBotModule for GetEmbeddingProvider
import { ChatBotModule } from '../chatbot/chatbot.module'
import { googleAIConfig } from '../../config/googleai.config'

@Module({
    imports: [
        ConfigModule.forFeature(googleAIConfig),
        MongooseModule.forFeature([
            { name: Concept.name, schema: ConceptSchema },
            { name: Student.name, schema: StudentSchema },
            { name: Lecturer.name, schema: LecturerSchema },
            { name: User.name, schema: UserSchema },
            { name: KnowledgeChunk.name, schema: KnowledgeChunkSchema },
            { name: KnowledgeSource.name, schema: KnowledgeSourceSchema }
        ]),
        forwardRef(() => ChatBotModule)
    ],
    controllers: [ConceptController, StudentOntologyController, LecturerOntologyController, MatchingController],
    providers: [
        ConceptSeederService,
        ConceptSyncService,
        StudentOntologyService,
        LecturerOntologyService,
        MatchingService
    ],
    exports: [
        ConceptSeederService,
        ConceptSyncService,
        StudentOntologyService,
        LecturerOntologyService,
        MatchingService
    ]
})
export class MatchingModule {}
