import { Module } from '@nestjs/common'
import { RefFieldsTopicsController } from './ref_fields_topics.controller'
import { RefFieldsTopicsService } from './application/ref_fields_topics.service'
import { MongooseModule } from '@nestjs/mongoose'
import { RefFieldTopics, RefFieldTopicSchema } from './schemas/ref_fields_topics.schemas'
import { RefFieldTopicsRepository } from './repository/impl/ref-requirement-topics.repository'

@Module({
    imports: [MongooseModule.forFeature([{ name: RefFieldTopics.name, schema: RefFieldTopicSchema }])],
    controllers: [RefFieldsTopicsController],
    providers: [
        RefFieldsTopicsService,
        {
            provide: 'IRefFieldsTopicsRepository',
            useClass: RefFieldTopicsRepository
        }
    ],
    exports: [RefFieldsTopicsService, 'IRefFieldsTopicsRepository']
})
export class RefFieldsTopicsModule {}
