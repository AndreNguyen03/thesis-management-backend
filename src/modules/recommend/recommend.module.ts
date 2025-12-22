import { Module } from '@nestjs/common'
import { RecommendController } from './recommend.controller'
import { TopicService } from '../topics/application/topic.service'
import { FieldsService } from '../fields/application/fields.service'
import { GetEmbeddingProvider } from '../chatbot/application/get-embedding.provider'
import { RequirementsService } from '../requirements/application/requirements.service'
import { StudentService } from '../../users/application/student.service'

@Module({
    imports: [TopicService, FieldsService, GetEmbeddingProvider, RequirementsService, StudentService],
    controllers: [RecommendController]
})
export class RecommendModule {}
