import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { GetTopicResponseDto } from '../../dtos'
import { Archive } from '../../schemas/archive.schemas'
import { ArchiveRepositoryInterface } from '../archive.repository.interface'
import { Model } from 'mongoose'
import { getUserModelFromRole } from '../../utils/get-user-model'
import { Injectable } from '@nestjs/common'
import { TopicNotArchivedException } from '../../../common/exceptions'
import { GetArchiveDto } from '../../dtos/archive/archive.dto'
import { plainToInstance } from 'class-transformer'
import { Topic } from '../../schemas/topic.schemas'

@Injectable()
export class ArchiveRepository extends BaseRepositoryAbstract<Archive> implements ArchiveRepositoryInterface {
    constructor(
        @InjectModel(Archive.name) private readonly archiveRepository: Model<Archive>,
        @InjectModel(Topic.name) private readonly TopicModel: Model<Topic> // Inject Topic model
    ) {
        super(archiveRepository)
    }
    async findSavedThesesByUserId(userId: string, role: string): Promise<GetTopicResponseDto[]> {
        const archive = await this.archiveRepository
            .findOne({ userId: userId, userModel: getUserModelFromRole(role) })
            .populate({
                path: 'savedTheses',
                model: 'Topic',
                populate: {
                    path: 'registrationIds',
                    select: 'registrantId registrantModel status',
                    populate: { path: 'registrantId', select: '_id fullName role' }
                }
            })
        if (!archive) {
            return []
        }
        const theses = await plainToInstance(GetTopicResponseDto, archive.savedTopic, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
        return theses.map((Topic) => ({
            ...Topic,
            isSaved: true
        }))
    }
    async archiveTopic(userId: string, role: string, TopicId: string): Promise<GetTopicResponseDto> {
        await this.archiveRepository.findOneAndUpdate(
            { userId: userId, userModel: getUserModelFromRole(role) },
            { $addToSet: { savedTheses: TopicId } },
            { upsert: true }
        )

        return _getTopicAfterAction(TopicId, this.TopicModel, true)
    }
    async unarchiveTopic(userId: string, TopicId: string, role: string): Promise<GetTopicResponseDto> {
        await this.archiveRepository.findOneAndUpdate(
            { userId: userId, userModel: getUserModelFromRole(role) },
            { $pull: { savedTheses: TopicId } }
        )
        return _getTopicAfterAction(TopicId, this.TopicModel, false)
    }
}
export const _getTopicAfterAction = async (
    TopicId: string,
    TopicModel: Model<Topic>,
    isSaved: boolean
): Promise<GetTopicResponseDto> => {
    const Topic = await TopicModel.findOne({ _id: TopicId, deleted_at: null }).populate({
        path: 'registrationIds',
        select: 'registrantId registrantModel status',
        populate: { path: 'registrantId', select: '_id fullName role' }
    })

    const TopicDto = await plainToInstance(GetTopicResponseDto, Topic, {
        excludeExtraneousValues: true,
        enableImplicitConversion: true
    })
    return {
        ...TopicDto,
        isSaved: isSaved
    }
}
