import { TopicRepositoryInterface } from '../topic.repository.interface'
import { Topic } from '../../schemas/topic.schemas'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model } from 'mongoose'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { GetTopicResponseDto } from '../../dtos'
import { plainToInstance } from 'class-transformer'
import { Archive } from '../../schemas/archive.schemas'
import { getUserModelFromRole } from '../../utils/get-user-model'

export class TopicRepository extends BaseRepositoryAbstract<Topic> implements TopicRepositoryInterface {
    public constructor(
        @InjectModel(Topic.name)
        private readonly TopicRepository: Model<Topic>,
        @InjectModel(Archive.name) private readonly archiveRepository: Model<Archive>
    ) {
        super(TopicRepository)
    }
    async getAllTheses(userId: string, role: string): Promise<GetTopicResponseDto[]> {
        const userArchive = await this.archiveRepository
            .findOne({ userId: new mongoose.Types.ObjectId(userId), userModel: getUserModelFromRole(role) })
            .select('savedTheses')
            .lean()
        const savedThesesIds = userArchive ? userArchive.savedTopic.map((id) => id.toString()) : []

        const theses = await this.TopicRepository
            .find({ deleted_at: null })
            .populate({
                path: 'registrationIds',
                select: 'registrantId registrantModel status',
                populate: { path: 'registrantId', select: '_id fullName role' }
            })
            .lean()
            .exec()
        const thesesWithSavedStatus = theses.map((Topic) => ({
            ...Topic,
            isSaved: savedThesesIds.includes(Topic._id.toString())
        }))
        const res = plainToInstance(GetTopicResponseDto, thesesWithSavedStatus, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
        return res
    }

    async findSavedByUser(userId: string, role: string): Promise<GetTopicResponseDto[]> {
        const theses = await this.TopicRepository
            .find({
                savedBy: { $elemMatch: { userId, role } }
            })
            .lean()
            .exec()
        // Chuyển đổi sang DTO
        return plainToInstance(GetTopicResponseDto, theses)
    }
    async saveTopic(userId: string, role: string, TopicId: string) {
        return this.TopicRepository
            .findByIdAndUpdate(TopicId, { $addToSet: { savedBy: { userId, role } } }, { new: true })
            .exec()
    }
}
