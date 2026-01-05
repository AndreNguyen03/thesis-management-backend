import { Injectable, NotFoundException } from '@nestjs/common'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { FileInfo, Milestone, MilestoneCreator, MilestoneStatus, MilestoneType } from '../../schemas/milestones.schemas'
import { IMilestoneRepository } from '../miletones.repository.interface'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model } from 'mongoose'
import {
    PaginationRequestTopicInMilestoneQuery,
    PayloadCreateMilestone,
    PayloadFacultyCreateMilestone,
    PayloadUpdateMilestone,
    RequestLecturerReview,
    ManageTopicsInDefenseMilestoneDto,
    DefenseAction,
    ManageLecturersInDefenseMilestoneDto
} from '../../dtos/request-milestone.dto'
import { ActiveUserData } from '../../../../auth/interface/active-user-data.interface'
import { StudentRegistrationStatus } from '../../../registrations/enum/student-registration-status.enum'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { LecturerReviewDecision } from '../../enums/lecturer-decision.enum'
import { DefenseCouncilMember, MilestoneTemplate } from '../../schemas/milestones-templates.schema'
import { Topic } from '../../../topics/schemas/topic.schemas'
import { TopicStatus } from '../../../topics/enum/topic-status.enum'
import { TranferStatusAndAddPhaseHistoryProvider } from '../../../topics/providers/tranfer-status-and-add-phase-history.provider'

@Injectable()
export class MilestoneRepository extends BaseRepositoryAbstract<Milestone> implements IMilestoneRepository {
    constructor(
        @InjectModel(Milestone.name) private readonly milestoneModel: Model<Milestone>,
        @InjectModel(MilestoneTemplate.name) private readonly milestoneTemplateModel: Model<MilestoneTemplate>,
        @InjectModel(Topic.name) private readonly topicModel: Model<Topic>,
        private readonly paginationProvider: PaginationProvider,
        private readonly transferStatusAndAddPhaseHistoryProvider: TranferStatusAndAddPhaseHistoryProvider
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
    async getMilestonesOfGroup(groupId: string, role: string): Promise<Milestone[]> {
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
            {
                $lookup: {
                    from: 'users',
                    localField: 'submission.createdBy',
                    foreignField: '_id',
                    as: 'submissionUserTmp'
                }
            },

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
                    foreignField: 'userId',
                    as: 'lecturerProfileTmp'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    let: { historyUserIds: '$submissionHistory.createdBy' },
                    pipeline: [
                        { $match: { $expr: { $in: ['$_id', { $ifNull: ['$$historyUserIds', []] }] } } },
                        { $project: { _id: 1, fullName: 1, email: 1, avatarUrl: 1 } }
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
                $unwind: { path: '$group', preserveNullAndEmptyArrays: true }
            },
            {
                $addFields: {
                    submisstion: {
                        lecturerDecision: '$submission.decision',
                        createdBy: { $ifNull: [{ $arrayElemAt: ['$submissionUserTmp', 0] }, null] },
                        lecturerInfo: {
                            $ifNull: [
                                '$submissionUserTmp',
                                null,
                                {
                                    $mergeObjects: [
                                        { $arrayElemAt: ['$lecturerUserTmp', 0] },
                                        {
                                            title: {
                                                $let: {
                                                    vars: { profile: { $arrayElemAt: ['$lecturerProfileTmp', 0] } },
                                                    in: '$$profile.title'
                                                }
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    },
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
                $lookup: {
                    from: 'milestones_templates',
                    localField: 'parentId',
                    foreignField: '_id',
                    as: 'template'
                }
            },
            {
                $unwind: {
                    path: '$template',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    title: {
                        $cond: [{ $ifNull: ['$parentId', false] }, '$template.title', '$title']
                    },
                    description: {
                        $cond: [{ $ifNull: ['$parentId', false] }, '$template.description', '$description']
                    },
                    dueDate: {
                        $cond: [{ $ifNull: ['$parentId', false] }, '$template.dueDate', '$dueDate']
                    },
                    type: {
                        $cond: [{ $ifNull: ['$parentId', false] }, '$template.type', '$type']
                    }
                }
            }
        ]
        pipeline.push(
            {
                $project: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    dueDate: 1,
                    type: 1,
                    progress: 1,
                    totalTasks: 1,
                    tasksCompleted: 1,
                    submission: 1,
                    submissionHistory: 1,
                    topicId: 1,
                    group: 1,
                    status: 1,
                    creatorType: 1,
                    isAbleEdit: { $cond: [{ $eq: ['$creatorType', role] }, true, false] }
                }
            },
            {
                $sort: { dueDate: -1 }
            }
        )
        const results = await this.milestoneModel.aggregate(pipeline).exec()
        return results
    }
    async createMilestone(body: PayloadCreateMilestone, user: ActiveUserData) {
        const res = await this.milestoneModel
            .aggregate([
                {
                    $lookup: {
                        from: 'groups',
                        let: {
                            groupId: {
                                $toObjectId: body.groupId
                            }
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ['$_id', '$$groupId']
                                    }
                                }
                            }
                        ],
                        as: 'group'
                    }
                },
                {
                    $unwind: '$group'
                },
                {
                    $lookup: {
                        from: 'topics',
                        localField: 'group.topicId',
                        foreignField: '_id',
                        as: 'topic'
                    }
                },
                {
                    $unwind: '$topic'
                },
                {
                    $project: {
                        _id: 0,
                        periodId: '$topic.periodId'
                    }
                }
            ])
            .exec()
        if (!res) {
            throw new NotFoundException('Không tìm thấy kỳ học của nhóm này')
        }
        const createdMilestone = new this.milestoneModel({
            ...body,
            periodId: res[0]?.periodId,
            createdBy: user.sub,
            creatorType: user.role
        })
        return await createdMilestone.save()
    }
    async facultyCreateMilestone(body: PayloadFacultyCreateMilestone, user: ActiveUserData, groupIds: string[]) {
        if (groupIds && groupIds.length === 0) {
            throw new NotFoundException('Chưa có đề tài nào tiến hành cả')
        }
        const { phaseName, ...payloadFinal } = body
        //tạo template
        const template = await this.milestoneTemplateModel.create({
            periodId: body.periodId,
            title: body.title,
            description: body.description,
            dueDate: body.dueDate,
            type: body.type
        })

        const milestonesToInsert = groupIds.map((groupId) => ({
            ...payloadFinal,
            groupId: groupId,
            parentId: template._id,
            creatorType: user.role,
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
        if (existingMilestone.submission) existingMilestone.submissionHistory.push(existingMilestone.submission)
        existingMilestone.submission = { date: new Date(), files, createdBy: userId }
        existingMilestone.status = MilestoneStatus.PENDING_REVIEW
        await existingMilestone.save()
        if (!existingMilestone) {
            throw new NotFoundException('Mốc deadline không tồn tại')
        }
        return existingMilestone
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
        return await this.milestoneTemplateModel.aggregate([
            {
                $match: {
                    periodId: new mongoose.Types.ObjectId(periodId),
                    deleted_at: null
                }
            },
            {
                $sort: { dueDate: -1 }
            },
            {
                $lookup: {
                    from: 'milestones',
                    localField: '_id',
                    foreignField: 'parentId',
                    as: 'milestones'
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
                    },
                    count: { $size: '$milestones' },
                    uncompleteNum: {
                        $size: {
                            $filter: {
                                input: '$milestones',
                                as: 'ms',
                                cond: { $ne: ['$$ms.status', MilestoneStatus.COMPLETED] }
                            }
                        }
                    },
                    isDownload: {
                        $cond: [
                            { $gt: [{ $size: '$milestones' }, 0] },
                            {
                                $anyElementTrue: {
                                    $map: {
                                        input: '$milestones',
                                        as: 'm',
                                        in: { $ne: ['$$m.submission', null] }
                                    }
                                }
                            },
                            false
                        ]
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    dueDate: 1,
                    type: 1,
                    count: 1,
                    status: 1,
                    periodId: 1,
                    uncompleteNum: 1,
                    isDownload: 1
                }
            }
        ])
    }

    async facultyGetMilestonesInManageDefenseAssignment(periodId: string): Promise<Milestone[]> {
        return await this.milestoneTemplateModel.aggregate([
            {
                $lookup: {
                    from: 'milestones',
                    localField: '_id',
                    foreignField: 'parentId',
                    as: 'milestones'
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
            },
            {
                $match: {
                    periodId: new mongoose.Types.ObjectId(periodId),
                    type: MilestoneType.DEFENSE,
                    deleted_at: null
                }
            },
            {
                $lookup: {
                    from: 'topics',
                    localField: 'topicIds',
                    foreignField: '_id',
                    as: 'topics'
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    dueDate: 1,
                    type: 1,
                    count: 1,
                    isActive: {
                        $cond: [{ $eq: ['$status', 'active'] }, true, false]
                    },
                    periodId: 1,
                    defenseCouncil: 1,
                    topicSnaps: 1,
                    isScorable: {
                        $cond: [{ $lt: ['$dueDate', '$$NOW'] }, true, false]
                    }
                }
            }
        ])
    }

    async facultyGetTopicInBatchMilestone(
        parentId: string,
        paginationQuery: PaginationRequestTopicInMilestoneQuery
    ): Promise<Paginated<Milestone>> {
        let pipeline: any[] = []
        pipeline.push(
            {
                $match: {
                    parentId: new mongoose.Types.ObjectId(parentId),
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

    async manageTopicsInDefenseMilestone(body: ManageTopicsInDefenseMilestoneDto, userId: string): Promise<void> {
        const { milestoneTemplateId, action, topicSnapshots } = body
        // Tìm milestone template
        const milestoneTemplate = await this.milestoneTemplateModel.findById(milestoneTemplateId)
        if (!milestoneTemplate) {
            throw new NotFoundException('Không tìm thấy mốc deadline template')
        }

        // Lấy danh sách topicIds từ topicSnapshots
        const topicIds = topicSnapshots.map((snap) => snap._id)

        if (action === DefenseAction.ADD) {
            // Thêm topics vào milestone template
            // Lọc ra các topicId chưa có trong mảng
            const newTopicSnapshots = topicSnapshots.filter(
                (snap) => !milestoneTemplate.topicSnaps.some((existingSnap) => existingSnap._id === snap._id.toString())
            )
            milestoneTemplate.topicSnaps.push(...newTopicSnapshots)

            await milestoneTemplate.save()

            for (const snap of newTopicSnapshots) {
                await this.transferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
                    snap._id,
                    TopicStatus.AssignedDefense,
                    userId,
                    `Chuyển đề tài vào mốc bảo vệ: ${milestoneTemplate.title}`
                )
            }
        } else if (action === DefenseAction.DELETE) {
            milestoneTemplate.topicSnaps = milestoneTemplate.topicSnaps.filter(
                (snap) => !topicIds.includes(snap._id.toString())
            )
            await milestoneTemplate.save()
            for (const topicId of topicIds) {
                await this.transferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
                    topicId,
                    TopicStatus.AwaitingEvaluation,
                    userId,
                    `Chuyển đề tài ra khỏi mốc bảo vệ: ${milestoneTemplate.title}`
                )
            }
        }
    }

    async manageLecturersInDefenseMilestone(body: ManageLecturersInDefenseMilestoneDto, userId: string): Promise<void> {
        const { milestoneTemplateId, action, defenseCouncil } = body
        // Tìm milestone template
        const milestoneTemplate = await this.milestoneTemplateModel.findById(milestoneTemplateId)
        if (!milestoneTemplate) {
            throw new NotFoundException('Không tìm thấy mốc deadline template')
        }

        if (action === DefenseAction.ADD) {
            // Thêm giảng viên vào hội đồng - lọc ra những người chưa có
            const newMembers = defenseCouncil.filter(
                (newMember: DefenseCouncilMember) =>
                    !milestoneTemplate.defenseCouncil.some(
                        (existingMember) => existingMember.memberId === newMember.memberId
                    )
            )
            milestoneTemplate.defenseCouncil.push(...newMembers)
        } else if (action === DefenseAction.DELETE) {
            // Xóa giảng viên khỏi hội đồng
            const memberIdsToRemove = defenseCouncil.map((member: DefenseCouncilMember) => member.memberId)
            milestoneTemplate.defenseCouncil = milestoneTemplate.defenseCouncil.filter(
                (member) => !memberIdsToRemove.includes(member.memberId.toString())
            )
        }

        await milestoneTemplate.save()
    }

    async saveScoringResult(templateId: string, fileId: string): Promise<MilestoneTemplate> {
        const milestoneTemplate = await this.milestoneTemplateModel.findById(templateId)
        if (!milestoneTemplate) {
            throw new NotFoundException('Không tìm thấy mốc deadline template')
        }
        milestoneTemplate.resultScoringTemplate = fileId
        await milestoneTemplate.save()

        return milestoneTemplate
    }
    async deleteScoringResultFile(milestoneTemplateId: string): Promise<MilestoneTemplate | null> {
        const existingMilestone = await this.milestoneTemplateModel
            .findOne({ _id: new mongoose.Types.ObjectId(milestoneTemplateId), deleted_at: null })
            .exec()
        if (!existingMilestone) {
            throw new NotFoundException('Không tìm thấy mốc deadline template')
        }
        existingMilestone.resultScoringTemplate = null
        await existingMilestone.save()
        return existingMilestone
    }

    async updateMilestoneTemplatePublishState(
        milestoneTemplateId: string,
        isPublished: boolean
    ): Promise<MilestoneTemplate> {
        const existingMilestone = await this.milestoneTemplateModel
            .findOne({ _id: new mongoose.Types.ObjectId(milestoneTemplateId), deleted_at: null })
            .exec()
        if (!existingMilestone) {
            throw new NotFoundException('Không tìm thấy mốc deadline template')
        }
        existingMilestone.isPublished = isPublished
        await existingMilestone.save()
        return existingMilestone
    }

    async blockGrade(milestoneId: string): Promise<MilestoneTemplate> {
        const existingMilestone = await this.milestoneTemplateModel
            .findOne({ _id: new mongoose.Types.ObjectId(milestoneId), deleted_at: null })
            .exec()
        if (!existingMilestone) {
            throw new NotFoundException('Không tìm thấy mốc bảo vệ')
        }
        existingMilestone.isBlock = true
        await existingMilestone.save()
        return existingMilestone
    }

    async getAllDefenseMilestonesForFaculty(facultyId: string): Promise<any[]> {

        const pipeline: any[] = [
            {
                $lookup: {
                    from: 'periods',
                    let: { periodId: '$periodId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$_id', '$$periodId'] },
                                        { $eq: ['$faculty', new mongoose.Types.ObjectId(facultyId)] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'periodInfo'
                }
            },
            { $unwind: { path: '$periodInfo' } },
            {
                $lookup: {
                    from: 'faculties',
                    localField: 'periodInfo.faculty',
                    foreignField: '_id',
                    as: 'facultyInfo'
                }
            },
            { $unwind: { path: '$facultyInfo', preserveNullAndEmptyArrays: true } },
            // Lookup topics để đếm
            {
                $lookup: {
                    from: 'topics',
                    localField: '_id',
                    foreignField: 'defenseResult.milestoneId',
                    as: 'topics'
                }
            },
            // Count topics và lecturers
            {
                $addFields: {
                    topicsCount: { $size: { $ifNull: ['$topicSnaps', []] } }
                }
            },
            // Project
            {
                $project: {
                    _id: 1,
                    title: 1,
                    location: 1,
                    dueDate: 1,
                    isPublished: 1,
                    isBlock: 1,
                    councilMembers: 1,
                    topicsCount: 1,
                    periodInfo: {
                        _id: 1,
                        year: 1,
                        semester: 1,
                        faculty: {
                            name: '$facultyInfo.name',
                            email: '$facultyInfo.email',
                            urlDirection: '$facultyInfo.urlDirection'
                        },
                        type: 1,
                        currentPhase: 1
                    }
                }
            },
            // Sort theo dueDate mới nhất
            { $sort: { dueDate: -1 } }
        ]

        return await this.milestoneTemplateModel.aggregate(pipeline).exec()
    }

    async getAssignedDefenseMilestonesForLecturer(lecturerId: string, facultyId: string): Promise<any[]> {
        const matchStage: any = {
            'defenseCouncil.memberId': new mongoose.Types.ObjectId(lecturerId)
        }

        const pipeline: any[] = [
            { $match: matchStage },
            // Lookup period
            {
                $lookup: {
                    from: 'periods',
                    localField: 'periodId',
                    foreignField: '_id',
                    as: 'periodInfo'
                }
            },
            { $unwind: { path: '$periodInfo', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'faculties',
                    localField: 'periodInfo.faculty',
                    foreignField: '_id',
                    as: 'facultyInfo'
                }
            },
            { $unwind: { path: '$facultyInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    location: 1,
                    dueDate: 1,
                    isPublished: 1,
                    isBlock: 1,
                    defenseCouncil: 1,
                    topicsCount: { $size: { $ifNull: ['$topicSnaps', []] } },
                    periodInfo: {
                        _id: 1,
                        year: 1,
                        semester: 1,
                        faculty: {
                            name: '$facultyInfo.name',
                            email: '$facultyInfo.email',
                            urlDirection: '$facultyInfo.urlDirection'
                        },
                        type: 1,
                        currentPhase: 1
                    }
                }
            },
            { $sort: { dueDate: -1 } }
        ]

        return await this.milestoneTemplateModel.aggregate(pipeline).exec()
    }
}
