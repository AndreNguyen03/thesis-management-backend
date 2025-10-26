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
    constructor(@InjectModel(UserSavedTopics.name) private readonly userSavedTopics: Model<UserSavedTopics>) {
        super(userSavedTopics)
    }
    async assignSaveTopic(userId: string, topicId: string): Promise<UserSavedTopics> {
        const newSavedTopic = new this.userSavedTopics({
            userId: new mongoose.Types.ObjectId(userId),
            topicId: new mongoose.Types.ObjectId(topicId)
        })
        return await newSavedTopic.save()
    }
    async unassignSaveTopic(userId: string, topicId: string): Promise<string> {
        await this.userSavedTopics.findOneAndUpdate(
            {
                userId: new mongoose.Types.ObjectId(userId),
                topicId: new mongoose.Types.ObjectId(topicId),
                deleted_at: null
            },
            { deleted_at: new Date() }
        )
        return 'Đã bỏ lưu đề tài thành công.'
    }
}
