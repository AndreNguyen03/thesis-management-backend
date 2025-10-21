import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import mongoose, { Model } from 'mongoose'

import { Injectable } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { Topic } from '../../schemas/topic.schemas'
import { GetTopicResponseDto } from '../../dtos'
import { UserSavedTopics } from '../../schemas/user_saved_topics.schemas'

import { UserSavedTopicRepositoryInterface } from '../user-saved-topic.interface'

@Injectable()
export class UserSavedTopicsRepository
    extends BaseRepositoryAbstract<UserSavedTopics>
    implements UserSavedTopicRepositoryInterface
{
    constructor(
        @InjectModel(UserSavedTopics.name) private readonly userSavedTopics: Model<UserSavedTopics>,
        @InjectModel(Topic.name) private readonly thesisModel: Model<Topic> // Inject Thesis model
    ) {
        super(userSavedTopics)
    }
    async unsaveTopic(userId: string, topicId: string): Promise<string> {
        const result = await this.userSavedTopics
            .deleteOne({
                userId: new mongoose.Schema.Types.ObjectId(userId),
                topicId: new mongoose.Schema.Types.ObjectId(topicId)
            })
            .exec()
        return "Topic unsaved successfully"
    }
    async findSavedTopicsByUserId(userId: string): Promise<GetTopicResponseDto[]> {
        const savedTopics = await this.userSavedTopics
            .find({ userId: new mongoose.Schema.Types.ObjectId(userId) })
            .lean()
            .exec()
        return plainToInstance(GetTopicResponseDto, savedTopics)
    }
}
