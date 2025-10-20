import { BadRequestException, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model } from 'mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { plainToInstance } from 'class-transformer'
import { getUserModelFromRole } from '../../utils/get-user-model'
import { Topic } from '../../schemas/topic.schemas'
import { UserSavedTopics } from '../../schemas/user_saved_topics.schemas'
import { GetTopicResponseDto } from '../../dtos'
import { TopicRepositoryInterface } from '../topic.repository.interface'

export class TopicRepository extends BaseRepositoryAbstract<Topic> implements TopicRepositoryInterface {
    public constructor(
        @InjectModel(Topic.name)
        private readonly topicRepository: Model<Topic>
        //   @InjectModel(UserSavedTopics.name) private readonly archiveRepository: Model<UserSavedTopics>
    ) {
        super(topicRepository)
    }
    async getAllTopics(userId: string, role: string): Promise<any> {
        // const userArchive = await this.archiveRepository
        //     .findOne({ userId: new mongoose.Types.ObjectId(userId), userModel: getUserModelFromRole(role) })
        //     .select('savedTheses')
        //     .lean()
        //const savedThesesIds = userArchive ? userArchive.savedTheses.map((id) => id.toString()) : []

        const theses = await this.topicRepository.aggregate([
            { $match: { deleted_at: null } },
            {
                $lookup: {
                    from: 'registrations', // tên collection
                    localField: '_id',
                    foreignField: 'thesisId',
                    as: 'registrations'
                }
            }
        ])

        return theses
    }

    async findSavedByUser(userId: string, role: string): Promise<GetTopicResponseDto[]> {
        const theses = await this.topicRepository
            .find({
                savedBy: { $elemMatch: { userId, role } }
            })
            .lean()
            .exec()
        // Chuyển đổi sang DTO
        return plainToInstance(GetTopicResponseDto, theses)
    }
}
