import { Module } from '@nestjs/common'
import { SearchService } from './search.service'
import { MongooseModule } from '@nestjs/mongoose'
import { TopicVector, TopicVectorSchema } from './schemas/topic_vectore.schemas'
import { googleAIConfig } from '../../config/googleai.config'
import { ConfigModule } from '@nestjs/config'
import { mongoConfig } from '../../config/database.config'
import { Topic, TopicSchema } from '../topics/schemas/topic.schemas'

@Module({
    providers: [SearchService],
    exports: [SearchService],
    imports: [
        MongooseModule.forFeature([
            { name: TopicVector.name, schema: TopicVectorSchema },
            { name: Topic.name, schema: TopicSchema }
        ]),
        ConfigModule.forFeature(googleAIConfig),
        ConfigModule.forFeature(mongoConfig)
    ]
})
export class TopicVectorModule {}
