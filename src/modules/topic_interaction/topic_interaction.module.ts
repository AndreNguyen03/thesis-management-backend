import { Module } from '@nestjs/common'
import { TopicInteractionController } from './topic_interaction.controller'
import { MongooseModule } from '@nestjs/mongoose'
import { TopicInteraction, TopicInteractionSchema } from './schema/topic_interaction.schema'
import { TopicInteractionService } from './application/topic_interaction.service'
import { TopicInteractionRepository } from './repository/impl/topic_interaction.repository'

@Module({
    imports: [MongooseModule.forFeature([{ name: TopicInteraction.name, schema: TopicInteractionSchema }])],
    controllers: [TopicInteractionController],
    providers: [
        TopicInteractionService,

        {
            provide: 'TOPIC_INTERACTION_REPOSITORY',
            useClass: TopicInteractionRepository
        }
    ],
    exports: [
        TopicInteractionService,
        {
            provide: 'TOPIC_INTERACTION_REPOSITORY',
            useClass: TopicInteractionRepository
        }
    ]
})
export class TopicInteractionModule {}
