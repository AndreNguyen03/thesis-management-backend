import { Module } from '@nestjs/common'
import { RequirementsService } from './application/requirements.service'
import { RequirementsController } from './requirements.controller'
import { MongooseModule } from '@nestjs/mongoose'
import { Requirement, RequirementSchema } from './schemas/requirement.schemas'
import { RequirementsRepository } from './repository/impl/requirements.reposittory'

@Module({
    imports: [MongooseModule.forFeature([{ name: Requirement.name, schema: RequirementSchema }])],
    providers: [
        RequirementsService,
        {
            provide: 'IRequirementsRepository',
            useClass: RequirementsRepository
        }
    ],
    controllers: [RequirementsController],
    exports: [RequirementsService]
})
export class RequirementsModule {}
