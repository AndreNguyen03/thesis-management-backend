import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { IGroupRepository } from '../groups.repository.interface'
import mongoose, { Model } from 'mongoose'
import { Group, GroupDocument } from '../../schemas/groups.schemas'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { PaginationQueryDto } from '../../../../common/pagination-an/dtos/pagination-query.dto'
import { Injectable, NotFoundException } from '@nestjs/common'
import { PeriodPhaseName } from '../../../periods/enums/period-phases.enum'
import { GroupDetailDto } from '../../dtos/get-groups.dtos'
import { de } from '@faker-js/faker/.'
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
        let pipeline: any[] = []
        pipeline.push(
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(id),
                    deleted_at: null
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'participants',
                    foreignField: '_id',
                    as: 'participants'
                }
            },
            {
                $lookup: {
                    from: 'topics',
                    localField: 'topicId',
                    foreignField: '_id',
                    as: 'topic'
                }
            },
            {
                $unwind: {
                    path: '$topic',
                    preserveNullAndEmptyArrays: true
                }
            }, // Lấy tất cả milestone templates của BCN cho period này
            {
                $lookup: {
                    from: 'milestones_templates',
                    let: { periodId: '$topic.periodId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$periodId', '$$periodId'] },
                                        { $eq: ['$creator', 'faculty_board'] }, // Chỉ lấy của BCN
                                        { $eq: ['$type', 'submission'] }, // Chỉ milestone submission
                                        { $eq: ['$isActive', true] },
                                        { $eq: ['$deleted_at', null] }
                                    ]
                                }
                            }
                        },
                        {
                            $project: { _id: 1 }
                        }
                    ],
                    as: 'facultyMilestoneTemplates'
                }
            },
            // Lấy các milestone mà nhóm đã hoàn thành
            {
                $lookup: {
                    from: 'milestones',
                    let: { groupId: '$_id', templateIds: '$facultyMilestoneTemplates._id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$groupId', '$$groupId'] },
                                        { $in: ['$refId', '$$templateIds'] },
                                        { $eq: ['$status', 'Completed'] }, // Đã hoàn thành
                                        { $eq: ['$isActive', true] },
                                        { $eq: ['$deleted_at', null] }
                                    ]
                                }
                            }
                        },
                        {
                            $project: { refId: 1 }
                        }
                    ],
                    as: 'completedMilestones'
                }
            },
            {
                $project: {
                    _id: 1,
                    topicId: 1,
                    type: 1,
                    topicStatus: '$topic.currentStatus',
                    topicTitleVN: '$topic.titleVN',
                    topicTitleEng: '$topic.titleEng',
                    participants: {
                        _id: 1,
                        fullName: 1,
                        avatarUrl: 1
                    },
                    lastMessage: 1,
                    lastSeenAtByUser: 1,
                    unreadCounts: 1,
                    isAbleGoToDefense: {
                        $cond: [
                            {
                                $and: [
                                    { $gt: [{ $size: '$facultyMilestoneTemplates' }, 0] }, // Có ít nhất 1 template
                                    {
                                        $eq: [
                                            { $size: '$facultyMilestoneTemplates' },
                                            { $size: '$completedMilestones' }
                                        ]
                                    }
                                ]
                            },
                            true,
                            false
                        ]
                    }
                }
            }
        )
        const results = await this.groupModel.aggregate(pipeline)
        const group = results[0]
        if (!group) {
            throw new NotFoundException('Không tìm thấy group')
        }

        return group
    }

    async getGroupsOfUser(userId: string, query: PaginationQueryDto): Promise<Paginated<Group>> {
        const userObjectId = new mongoose.Types.ObjectId(userId)

        const pipeline: any[] = [
            { $match: { type: 'group', participants: userObjectId } },

            // lookup topic
            {
                $lookup: {
                    from: 'topics',
                    localField: 'topicId',
                    foreignField: '_id',
                    as: 'topic',
                    pipeline: [{ $project: { titleVN: 1, type: 1 } }]
                }
            },
            { $addFields: { topic: { $arrayElemAt: ['$topic', 0] } } },

            // lookup sender info for lastMessage
            {
                $lookup: {
                    from: 'users',
                    let: { senderId: { $toObjectId: '$lastMessage.senderId' } },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$senderId'] } } },
                        { $project: { _id: 1, fullName: 1, avatarUrl: 1 } }
                    ],
                    as: 'senderInfo'
                }
            },
            {
                $addFields: {
                    lastMessage: {
                        $cond: {
                            if: { $gt: [{ $size: '$senderInfo' }, 0] },
                            then: { $mergeObjects: ['$lastMessage', { $arrayElemAt: ['$senderInfo', 0] }] },
                            else: '$lastMessage'
                        }
                    }
                }
            },

            // project final fields
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

        // trả về plain object để controller convert DTO
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

    async getGroupIdsByPeriodId(periodId: string, phaseName: PeriodPhaseName): Promise<string[]> {
        //exuction//in_progress
        const pipeline: any[] = []
        pipeline.push(
            {
                $lookup: {
                    from: 'topics',
                    let: { phaseName: phaseName, periodId: new mongoose.Types.ObjectId(periodId) },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$periodId', '$$periodId'] },
                                        { $eq: ['$currentPhase', '$$phaseName'] },
                                        { $eq: ['$deleted_at', null] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'topicIds'
                }
            },
            {
                $match: {
                    $expr: {
                        $and: [{ $in: ['$topicId', '$topicIds._id'] }, { $eq: ['$deleted_at', null] }]
                    }
                }
            }
        )
        return await this.groupModel.aggregate(pipeline).then((results) => results.map((group) => group._id.toString()))
    }
}
