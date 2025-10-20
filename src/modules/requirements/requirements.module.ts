import { Module } from '@nestjs/common'
import { RequirementsService } from './application/requirements.service'
import { RequirementsController } from './requirements.controller'
import { MongooseModule } from '@nestjs/mongoose'
import { Requirement, RequirementSchema } from './schemas/requirement.schemas'

@Module({
    imports: [MongooseModule.forFeature([{ name: Requirement.name, schema: RequirementSchema }])],
    providers: [RequirementsService],
    controllers: [RequirementsController],
    exports: [RequirementsService]
})
export class RequirementsModule {}
