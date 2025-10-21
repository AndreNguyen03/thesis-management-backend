import { Module } from '@nestjs/common'
import { RefRequirementsTopicsService } from './application/ref_requirements_topics.service'
import { RefRequirementTopicsRepository } from './repository/impl/ref-requirement-topics.repository'
import { MongooseModule } from '@nestjs/mongoose'
import { RefRequirementTopics, RefRequirementTopicSchema } from './schemas/ref_requirement_topics.schemas'
import { RefRequirementsTopicsController } from './ref_requirements_topics.controller'

@Module({
    imports: [MongooseModule.forFeature([{ name: RefRequirementTopics.name, schema: RefRequirementTopicSchema }])],
    providers: [
        RefRequirementsTopicsService,
        {
            provide: 'IRefRequirementTopicsRepository',
            useClass: RefRequirementTopicsRepository
        }
    ],
    controllers: [RefRequirementsTopicsController],
    exports: [RefRequirementsTopicsService]
})
export class RefRequirementsTopicsModule {}
