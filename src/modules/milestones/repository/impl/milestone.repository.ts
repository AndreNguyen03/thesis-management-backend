import { Injectable, NotFoundException } from '@nestjs/common'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { FileInfo, Milestone, MilestoneStatus, MilestoneType } from '../../schemas/milestones.schemas'
import { BaseRepositoryInterface } from '../../../../shared/base/repository/base.repository.interface'
import { IMilestoneRepository } from '../miletones.repository.interface'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model } from 'mongoose'
import {
    PaginationRequestTopicInMilestoneQuery,
    PayloadCreateMilestone,
    PayloadFacultyCreateMilestone,
    PayloadUpdateMilestone,
    RequestLecturerReview
} from '../../dtos/request-milestone.dto'
import { v4 as uuidv4 } from 'uuid'
import { ActiveUserData } from '../../../../auth/interface/active-user-data.interface'
import { StudentRegistrationStatus } from '../../../registrations/enum/student-registration-status.enum'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { LecturerReviewDecision } from '../../enums/lecturer-decision.enum'
import { title } from 'process'

@Injectable()
export class MilestoneRepository extends BaseRepositoryAbstract<Milestone> implements IMilestoneRepository {
    constructor(
        @InjectModel(Milestone.name) private readonly milestoneModel: Model<Milestone>,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(milestoneModel)
    }

    async reviewMilestone(milestoneId: string, lecturerId: string, body: RequestLecturerReview): Promise<boolean> {
        const milestone = await this.milestoneModel
            .findOne({ _id: new mongoose.Types.ObjectId(milestoneId), deleted_at: null })
            .exec()
        if (!milestone) {
            throw new NotFoundException('Mốc deadline không tồn tại')
        }
        milestone.submission.lecturerFeedback = body.comment
        milestone.submission.lecturerId = lecturerId
        milestone.submission.feedbackAt = new Date()
        milestone.submission.decision = body.decision
        let isAbleGotoDefense = false
        if (body.decision === LecturerReviewDecision.APPROVED) {
            milestone.status = MilestoneStatus.COMPLETED
            isAbleGotoDefense = await this.activateNextSequentialMilestone(milestone.groupId, milestone.dueDate)
        } else {
            milestone.status = MilestoneStatus.NEEDS_REVISION
        }
        await milestone.save()
        return isAbleGotoDefense
    }
    // currrentDueDate
    public async activateNextSequentialMilestone(groupId: string, currentDueDate: Date) {
        let isAbleGotoDefense = false
        //kiểm tra xem mốc do ban chủ nhiệm tạo còn không
        const nextMilestone = await this.milestoneModel
            .findOne({
                groupId,
                refId: { $ne: null }, // lấy những milestone do ban chủ nhiệm tạo
                dueDate: { $gt: currentDueDate },
                isActive: false
            })
            .sort({ dueDate: 1 }) // Lấy mốc gần nhất tiếp theo

        if (nextMilestone) {
            nextMilestone.isActive = true
            await nextMilestone.save()
        } else {
            isAbleGotoDefense = true
        }
        return isAbleGotoDefense
    }

    async updateMilestone(milestoneId: string, body: PayloadUpdateMilestone): Promise<Milestone> {
        const updateMilestone = await this.milestoneModel
            .findOneAndUpdate({ _id: milestoneId, deleted_at: null }, body, { new: true })
            .exec()
        if (!updateMilestone) {
            throw new NotFoundException('Mốc deadline không tồn tại')
        }
        return updateMilestone
    }
    async getMilestonesOfGroup(groupId: string): Promise<Milestone[]> {
        const groupObjectId = new mongoose.Types.ObjectId(groupId)

        const pipeline: any[] = [
            {
                $match: {
                    groupId: groupObjectId,
                    deleted_at: null
                }
            },
            {
                $lookup: {
                    from: 'tasks',
                    let: { taskIds: '$taskIds' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $in: ['$_id', { $ifNull: ['$$taskIds', []] }] },
                                deleted_at: null
                            }
                        }
                    ],
                    as: 'tasks'
                }
            },
            {
                $addFields: {
                    totalTasks: { $size: { $ifNull: ['$tasks', []] } },
                    tasksCompleted: {
                        $size: {
                            $filter: {
                                input: { $ifNull: ['$tasks', []] },
                                as: 'task',
                                cond: { $eq: ['$$task.status', 'Done'] }
                            }
                        }
                    }
                }
            },
            // Tính % progress
            {
                $addFields: {
                    progress: {
                        $cond: [
                            { $eq: ['$totalTasks', 0] },
                            0,
                            { $multiply: [{ $divide: ['$tasksCompleted', '$totalTasks'] }, 100] }
                        ]
                    }
                }
            },
            // Lookup User nộp bài
            {
                $lookup: {
                    from: 'users',
                    localField: 'submission.createdBy',
                    foreignField: '_id',
                    as: 'submissionUserTmp'
                }
            },
            // Lookup Lecturer Info (Gộp User và Lecturer profile)
            {
                $lookup: {
                    from: 'users',
                    localField: 'submission.lecturerId',
                    foreignField: '_id',
                    as: 'lecturerUserTmp'
                }
            },
            {
                $lookup: {
                    from: 'lecturers',
                    localField: 'submission.lecturerId',
                    foreignField: 'userId', // Giả sử lecturerId trong submission là userId
                    as: 'lecturerProfileTmp'
                }
            },
            // Lookup tất cả User có trong history cùng 1 lúc
            {
                $lookup: {
                    from: 'users',
                    let: { historyUserIds: '$submissionHistory.createdBy' },
                    pipeline: [
                        { $match: { $expr: { $in: ['$_id', { $ifNull: ['$$historyUserIds', []] }] } } },
                        { $project: { _id: 1, fullName: 1, email: 1, avatarUrl: 1 } } // Chỉ lấy field cần thiết
                    ],
                    as: 'historyUsersMap'
                }
            },
            {
                $lookup: {
                    from: 'groups',
                    localField: 'groupId',
                    foreignField: '_id',
                    as: 'group'
                }
            },
            {
                $unwind: { path: '$group', preserveNullAndEmptyArrays: false }
            },
            // ---------------------------------------------------------
            {
                $addFields: {
                    'submission.lecturerDecision': '$submission.decision',
                    'submission.createdBy': { $arrayElemAt: ['$submissionUserTmp', 0] },

                    // Merge thông tin Lecturer
                    'submission.lecturerInfo': {
                        $mergeObjects: [
                            { $arrayElemAt: ['$lecturerUserTmp', 0] }, // Thông tin user cơ bản
                            {
                                title: {
                                    $let: {
                                        vars: { profile: { $arrayElemAt: ['$lecturerProfileTmp', 0] } },
                                        in: '$$profile.title' // Chỉ lấy field title từ lecturer profile
                                    }
                                }
                            }
                        ]
                    },

                    // Map User vào History array (Thay thế ID bằng Object User)
                    submissionHistory: {
                        $map: {
                            input: '$submissionHistory',
                            as: 'hist',
                            in: {
                                $mergeObjects: [
                                    '$$hist',
                                    {
                                        createdBy: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: '$historyUsersMap',
                                                        as: 'u',
                                                        cond: { $eq: ['$$u._id', '$$hist.createdBy'] }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    },
                    topicId: '$group.topicId'
                }
            },
            {
                $project: {
                    submissionUserTmp: 0,
                    lecturerUserTmp: 0,
                    lecturerProfileTmp: 0,
                    historyUsersMap: 0,
                    taskIds: 0 // Ẩn mảng ID gốc nếu không cần
                }
            },
            {
                $sort: { dueDate: -1 }
            }
        ]

        const results = await this.milestoneModel.aggregate(pipeline).exec()
        return results
    }
    async createMilestone(body: PayloadCreateMilestone, user: ActiveUserData) {
        const createdMilestone = new this.milestoneModel({ ...body, createdBy: user.sub, creatorType: user.role })
        return await createdMilestone.save()
    }
    async facultyCreateMilestone(body: PayloadFacultyCreateMilestone, user: ActiveUserData, groupIds: string[]) {
        if (groupIds && groupIds.length === 0) {
            throw new NotFoundException('Chưa có đề tài nào tiến hành cả')
        }
        const { phaseName, ...payloadFinal } = body
        //tạo payload mẫu
        const batchId = uuidv4()
        const milestonesToInsert = groupIds.map((groupId) => ({
            ...payloadFinal,
            groupId: groupId,
            refId: batchId,
            creatorType: user.role,
            batchId: batchId,
            createdBy: user.sub
        }))
        //kiểm tra xem trong group có milestone của ban chu nhiệm trước đó hay không
        await this.milestoneModel.insertMany(milestonesToInsert)
    }
    async uploadReport(miletoneId: string, files: FileInfo[], userId: string): Promise<Milestone> {
        const existingMilestone = await this.milestoneModel
            .findOne({ _id: new mongoose.Types.ObjectId(miletoneId), deleted_at: null })
            .exec()
        if (!existingMilestone) {
            throw new NotFoundException('Mốc deadline không tồn tại')
        }
        const updateMilestone = await this.milestoneModel
            .findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(miletoneId), deleted_at: null },

                {
                    status: MilestoneStatus.PENDING_REVIEW,
                    $push: {
                        submissionHistory: existingMilestone.submission
                    },
                    $set: { submission: { date: new Date(), files, createdBy: new mongoose.Types.ObjectId(userId) } }
                },
                { new: true }
            )
            .exec()
        if (!updateMilestone) {
            throw new NotFoundException('Mốc deadline không tồn tại')
        }
        return updateMilestone
    }
    async createTaskInMinesTone(milestoneId: string, taskId: string): Promise<Milestone> {
        const updateMilestone = await this.milestoneModel
            .findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(milestoneId), deleted_at: null },
                { $push: { taskIds: new mongoose.Types.ObjectId(taskId) } },
                { new: true }
            )
            .exec()
        if (!updateMilestone) {
            throw new NotFoundException('Mốc deadline không tồn tại')
        }
        return updateMilestone
    }
    async facultyGetMilestonesInPeriod(periodId: string): Promise<Milestone[]> {
        return await this.milestoneModel.aggregate([
            {
                $match: {
                    periodId: new mongoose.Types.ObjectId(periodId),
                    refId: { $ne: null },
                    deleted_at: null
                }
            },
            {
                $sort: { dueDate: -1 }
            },
            {
                $group: {
                    _id: {
                        refId: '$refId',
                        periodId: '$periodId'
                    },
                    title: { $first: '$title' },
                    type: { $first: '$type' },
                    description: { $first: '$description' },
                    dueDate: { $first: '$dueDate' },
                    //milestones: { $push: '$$ROOT' },
                    count: { $sum: 1 },
                    uncompleteNum: {
                        $sum: {
                            $cond: [{ $eq: ['$submission', null] }, 1, 0]
                        }
                    }
                }
            },
            {
                $addFields: {
                    status: {
                        $switch: {
                            branches: [
                                {
                                    case: { $lt: ['$$NOW', '$dueDate'] },
                                    then: 'active'
                                },
                                {
                                    case: { $gt: ['$$NOW', '$dueDate'] },
                                    then: 'timeout'
                                }
                            ],
                            default: 'timeout'
                        }
                    }
                }
            }
        ])
    }

    async facultyGetTopicInBatchMilestone(
        batchId: string,
        paginationQuery: PaginationRequestTopicInMilestoneQuery
    ): Promise<Paginated<Milestone>> {
        let pipeline: any[] = []
        pipeline.push(
            {
                $match: {
                    refId: batchId,
                    deleted_at: null
                }
            },
            {
                $lookup: {
                    from: 'groups',
                    localField: 'groupId',
                    foreignField: '_id',
                    as: 'group'
                }
            },
            { $unwind: { path: '$group', preserveNullAndEmptyArrays: false } },
            {
                $lookup: {
                    from: 'topics',
                    localField: 'group.topicId',
                    foreignField: '_id',
                    as: 'topic'
                }
            },
            { $unwind: { path: '$topic', preserveNullAndEmptyArrays: false } },
            {
                $lookup: {
                    from: 'majors',
                    localField: 'topic.majorId',
                    foreignField: '_id',
                    as: 'major'
                }
            },
            { $unwind: { path: '$major', preserveNullAndEmptyArrays: false } },
            {
                $lookup: {
                    from: 'ref_students_topics',
                    let: { topicId: 'topic._id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$topicId', '$$topicId'] },
                                        {
                                            $not: {
                                                $in: [
                                                    '$status',
                                                    [
                                                        StudentRegistrationStatus.CANCELLED,
                                                        StudentRegistrationStatus.REJECTED,
                                                        StudentRegistrationStatus.WITHDRAWN
                                                    ]
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'studentRef'
                }
            },

            // Join lecturerIds qua ref_lecturers_topics
            {
                $lookup: {
                    from: 'ref_lecturers_topics',
                    let: { topicId: 'topic._id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [{ $eq: ['$topicId', '$$topicId'] }, { $eq: ['$deleted_at', null] }]
                                }
                            }
                        }
                    ],
                    as: 'lecturerRef'
                }
            },
            // Join users qua ref_lecturers_topics
            {
                $lookup: {
                    from: 'users',
                    localField: 'lecturerRef.userId',
                    foreignField: '_id',
                    as: 'lecUserInfo'
                }
            },
            // Join lecturers qua ref_lecturers_topics để lấy thông tin giảng viên
            {
                $lookup: {
                    from: 'lecturers',
                    localField: 'lecturerRef.userId',
                    foreignField: 'userId',
                    as: 'lectInfos'
                }
            },
            {
                $addFields: {
                    lecturers: {
                        $map: {
                            input: '$lecUserInfo',
                            as: 'userInfo',
                            in: {
                                $mergeObjects: [
                                    {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: '$lectInfos',
                                                    as: 'lecInfo',
                                                    cond: { $eq: ['$$lecInfo.userId', '$$userInfo._id'] }
                                                }
                                            },
                                            0
                                        ]
                                    },
                                    '$$userInfo'
                                ]
                            }
                        }
                    }
                }
            },
            //Lấy roleIntopic của giảng viên
            {
                $addFields: {
                    lecturers: {
                        $map: {
                            input: '$lecturers',
                            as: 'lect',
                            in: {
                                $mergeObjects: [
                                    '$$lect',
                                    {
                                        roleInTopic: {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: {
                                                            $filter: {
                                                                input: '$lecturerRef',
                                                                as: 'ref',
                                                                cond: { $eq: ['$$ref.userId', '$$lect._id'] }
                                                            }
                                                        },
                                                        as: 'filteredRef',
                                                        in: '$$filteredRef.role'
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        )
        pipeline.push({
            $project: {
                _id: 1,
                topicId: '$topic._id',
                titleVN: '$topic.titleVN',
                titleEng: '$topic.titleEng',
                majorName: '$major.name',
                studentNum: { $size: '$studentRef' },
                lecturers: 1,
                status: {
                    $cond: [{ $eq: ['$submission', null] }, 'unsubmit', 'submitted']
                }
            }
        })
        return await this.paginationProvider.paginateQuery<Milestone>(paginationQuery, this.milestoneModel, pipeline)
    }
    async getTopicNameByMilestoneId(milestoneId: string): Promise<string> {
        const result = await this.milestoneModel.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(milestoneId),
                    deleted_at: null
                }
            },
            {
                $lookup: {
                    from: 'groups',
                    localField: 'groupId',
                    foreignField: '_id',
                    as: 'group'
                }
            },
            { $unwind: { path: '$group', preserveNullAndEmptyArrays: false } },
            {
                $lookup: {
                    from: 'topics',
                    localField: 'group.topicId',
                    foreignField: '_id',
                    as: 'topic'
                }
            },
            { $unwind: { path: '$topic', preserveNullAndEmptyArrays: false } },
            {
                $project: {
                    _id: 0,
                    titleVN: '$topic.titleVN'
                }
            }
        ])
        if (!result || result.length === 0) {
            return 'Không tìm thấy đề tài'
        }
        return result[0].titleVN || 'Không tìm thấy đề tài'
    }
}
