import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { RatingController } from './rating.controller'
import { RatingService } from './application/rating.service'
import { RatingRepository } from './repository/rating.repository'
import { Rating, RatingSchema } from './schemas/rating.schemas'
import { Topic, TopicSchema } from '../topics/schemas/topic.schemas'

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Rating.name, schema: RatingSchema },
            { name: Topic.name, schema: TopicSchema }
        ])
    ],
    controllers: [RatingController],
    providers: [RatingService, RatingRepository],
    exports: [RatingService, RatingRepository]
})
export class RatingModule {}
