import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { IGroupRepository } from '../groups.repository.interface'
import mongoose, { Model } from 'mongoose'
import { Group } from '../../schemas/groups.schemas'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { PaginationQueryDto } from '../../../../common/pagination-an/dtos/pagination-query.dto'
import { Injectable, NotFoundException } from '@nestjs/common'
@Injectable()
export class GroupRepository extends BaseRepositoryAbstract<Group> implements IGroupRepository {
    constructor(
        @InjectModel(Group.name) private readonly groupModel: Model<Group>,
        private readonly pagination: PaginationProvider
    ) {
        super(groupModel)
    }
    //lấy tin nhắn và milestone của cuộc trò chuyện
    async getGroupDetail(id: string): Promise<Group> {
        const group = await this.groupModel
            .findOne({
                _id: new mongoose.Types.ObjectId(id)
            })
            .populate({
                path: 'participants',
                select: '_id fullName avatarUrl'
            })

        if (!group) {
            throw new NotFoundException('Không tìm thấy group')
        }

        return group
    }
    async getGroupsOfUser(userId: string, query: PaginationQueryDto): Promise<Paginated<Group>> {
        let pipeline: any[] = []
        pipeline.push(
            {
                $match: {
                    participants: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup: {
                    from: 'topics',
                    localField: 'topicId',
                    foreignField: '_id',
                    as: 'topic',
                    pipeline: [{ $project: { titleVN: 1, type: 1 } }]
                }
            },
            {
                $addFields: {
                    // Chuyển array thành object (vì lookup trả array)
                    topics: { $arrayElemAt: ['$topic', 0] }
                }
            },
            // Thêm stage $lookup riêng cho sender (nested lookup đúng cách)
            {
                $lookup: {
                    from: 'users',
                    let: { senderId: { $toObjectId: '$lastMessage.senderId' } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$senderId'] }
                            }
                        },
                        {
                            $project: { _id: 0, fullName: 1 }
                        }
                    ],
                    as: 'senderInfo'
                }
            },
            // Merge senderInfo vào lastMessage nếu lastMessage tồn tại
            {
                $addFields: {
                    lastMessage: {
                        $cond: {
                            if: { $gt: [{ $size: '$senderInfo' }, 0] },
                            then: {
                                $mergeObjects: ['$lastMessage', { $arrayElemAt: ['$senderInfo', 0] }]
                            },
                            else: '$lastMessage'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    topicId: 1,
                    titleVN: '$topics.titleVN',
                    topicType: '$topics.type',
                    type: 1,
                    participants: 1,
                    lastMessage: 1,
                    seenBy: 1,
                    unreadCounts: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    lastSeenAtByUser: 1
                }
            }
        )
        return await this.pagination.paginateQuery<Group>(query, this.groupModel, pipeline)
    }
}
