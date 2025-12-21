import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { IGroupRepository } from '../groups.repository.interface'
import mongoose, { Model } from 'mongoose'
import { Group, GroupDocument } from '../../schemas/groups.schemas'
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
                _id: new mongoose.Types.ObjectId(id),
                type: 'group'
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
        const pipeline: any[] = [
            {
                $match: {
                    type: 'group',
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
                    topic: { $arrayElemAt: ['$topic', 0] }
                }
            },
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
                    titleVN: '$topic.titleVN',
                    topicType: '$topic.type',
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
        ]

        return this.pagination.paginateQuery<Group>(query, this.groupModel, pipeline)
    }

    async createOrGetDirectGroup(currentUserId: string, targetUserId: string): Promise<Group> {
        const userA = new mongoose.Types.ObjectId(currentUserId)
        const userB = new mongoose.Types.ObjectId(targetUserId)

        let group = await this.groupModel.findOne({
            type: 'direct',
            participants: { $all: [userA, userB] },
            $expr: { $eq: [{ $size: '$participants' }, 2] }
        })

        if (!group) {
            try {
                group = await this.groupModel.create({
                    type: 'direct',
                    participants: [userA, userB],
                    topicId: null,
                    unreadCounts: {},
                    lastSeenAtByUser: {}
                })
            } catch {
                // tránh race condition: nếu đã được tạo song song
                group = await this.groupModel.findOne({
                    type: 'direct',
                    participants: { $all: [userA, userB] },
                    $expr: { $eq: [{ $size: '$participants' }, 2] }
                })
            }
        }

        if (!group) {
            throw new Error('Failed to create or get direct group')
        }

        return group
    }

    async getUserDirectGroups(userId: string, query: PaginationQueryDto) {
        const currentUserObjectId = new mongoose.Types.ObjectId(userId)

        const pipeline = [
            {
                $match: {
                    type: 'direct',
                    participants: currentUserObjectId
                }
            },

            // Populate participants
            {
                $lookup: {
                    from: 'users',
                    localField: 'participants',
                    foreignField: '_id',
                    as: 'participants'
                }
            },

            // Xác định otherUser + unreadCount
            {
                $addFields: {
                    otherUser: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: '$participants',
                                    as: 'p',
                                    cond: { $ne: ['$$p._id', currentUserObjectId] }
                                }
                            },
                            0
                        ]
                    },
                    unreadCount: {
                        $ifNull: [`$unreadCounts.${userId}`, 0]
                    }
                }
            },

            // Populate sender của lastMessage
            {
                $lookup: {
                    from: 'users',
                    let: { senderId: '$lastMessage.senderId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$senderId'] }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                fullName: 1,
                                avatarUrl: 1
                            }
                        }
                    ],
                    as: 'sender'
                }
            },

            {
                $addFields: {
                    lastMessage: {
                        $cond: {
                            if: { $gt: [{ $size: '$sender' }, 0] },
                            then: {
                                $mergeObjects: ['$lastMessage', { sender: { $arrayElemAt: ['$sender', 0] } }]
                            },
                            else: '$lastMessage'
                        }
                    }
                }
            },

            {
                $project: {
                    _id: 1,
                    type: 1,
                    otherUser: {
                        _id: 1,
                        fullName: 1,
                        avatarUrl: 1
                    },
                    lastMessage: 1,
                    unreadCount: 1,
                    updatedAt: 1
                }
            },

            // Sort theo message mới nhất
            {
                $sort: {
                    'lastMessage.createdAt': -1,
                    updatedAt: -1
                }
            }
        ]

        return this.pagination.paginateQuery<Group>(query, this.groupModel, pipeline)
    }
}
