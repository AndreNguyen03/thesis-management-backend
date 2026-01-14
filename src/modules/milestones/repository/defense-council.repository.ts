import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import mongoose from 'mongoose'
import { DefenseCouncil } from '../schemas/defense-council.schema'
import {
    CreateDefenseCouncilDto,
    AddTopicToCouncilDto,
    AddMultipleTopicsToCouncilDto,
    UpdateTopicMembersDto,
    SubmitScoreDto,
    UpdateDefenseCouncilDto,
    QueryDefenseCouncilsDto,
    GetDefenseCouncilsQuery,
    SubmitTopicScoresDto
} from '../dtos/defense-council.dto'
import { PaginationAnModule } from '../../../common/pagination-an/pagination.module'
import { PaginationProvider } from '../../../common/pagination-an/providers/pagination.provider'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { pipeline } from 'stream'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { StudentRegistrationStatus } from '../../registrations/enum/student-registration-status.enum'

@Injectable()
export class DefenseCouncilRepository {
    constructor(
        @InjectModel(DefenseCouncil.name)
        private readonly defenseCouncilModel: Model<DefenseCouncil>,
        private readonly paginationQuery: PaginationProvider
    ) {}

    // Tạo hội đồng mới
    async createCouncil(dto: CreateDefenseCouncilDto, userId: string): Promise<DefenseCouncil> {
        const council = new this.defenseCouncilModel({
            ...dto,
            createdBy: userId,
            topics: []
        })
        return await council.save()
    }

    // Lấy danh sách hội đồng theo query
    async getCouncils(query: GetDefenseCouncilsQuery): Promise<Paginated<DefenseCouncil>> {
        const pipelineSub: any[] = []
        pipelineSub.push({
            $match: {
                deleted_at: null,
                ...(query.milestoneTemplateId
                    ? { milestoneTemplateId: new mongoose.Types.ObjectId(query.milestoneTemplateId) }
                    : {}),
                ...(query.fromDate ? { scheduledDate: { $gte: query.fromDate } } : {}),
                ...(query.toDate ? { scheduledDate: { $lte: query.toDate } } : {}),
                ...(query.isCompleted !== undefined ? { isCompleted: query.isCompleted } : {}),
                ...(query.isPublished !== undefined ? { isPublished: query.isPublished } : {})
            }
        })
        pipelineSub.push(
            {
                $lookup: {
                    from: 'users',
                    localField: 'createdBy',
                    foreignField: '_id',
                    as: 'createdBy',
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                fullName: 1,
                                email: 1,
                                phone: 1,
                                avatarUrl: 1,
                                role: 1,
                                title: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true }
            },
            {
                $lookup: {
                    from: 'milestones_templates',
                    foreignField: '_id',
                    localField: 'milestoneTemplateId',
                    as: 'defenseMilestonesInfo'
                }
            },
            {
                $unwind: { path: '$defenseMilestonesInfo' }
            },
            {
                $lookup: {
                    from: 'periods',
                    foreignField: '_id',
                    localField: 'defenseMilestonesInfo.periodId',
                    as: 'periodInfo'
                }
            },
            {
                $unwind: { path: '$periodInfo' }
            },
            {
                $lookup: {
                    from: 'faculties',
                    foreignField: '_id',
                    localField: 'periodInfo.faculty',
                    as: 'facultyInfo'
                }
            },
            {
                $unwind: { path: '$facultyInfo' }
            },
            {
                $project: {
                    _id: 1,
                    defenseMilestone: {
                        title: '$defenseMilestonesInfo.title',
                        description: '$defenseMilestonesInfo.description'
                    },
                    periodInfo: {
                        _id: '$periodInfo._id',
                        year: '$periodInfo.year',
                        semester: '$periodInfo.semester',
                        currentPhase: '$periodInfo.currentPhase',
                        faculty: '$facultyInfo'
                    },
                    name: 1,
                    location: 1,
                    scheduledDate: 1,
                    topicsNum: {
                        $size: '$topics'
                    },
                    isCompleted: 1,
                    isPublished: 1,
                    createdBy: 1
                }
            }
        )

        return await this.paginationQuery.paginateQuery<DefenseCouncil>(query, this.defenseCouncilModel, pipelineSub)
    }

    // Lấy chi tiết hội đồng
    async getCouncilById(councilId: string): Promise<DefenseCouncil> {
        const pipeline: any[] = []
        pipeline.push(
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(councilId),
                    deleted_at: null
                }
            },
            {
                $lookup: {
                    from: 'milestones_templates',
                    foreignField: '_id',
                    localField: 'milestoneTemplateId',
                    as: 'defenseMilestonesInfo'
                }
            },
            {
                $unwind: { path: '$defenseMilestonesInfo' }
            },
            {
                $lookup: {
                    from: 'users',
                    foreignField: '_id',
                    localField: 'createdBy',
                    as: 'userInfo'
                }
            },
            {
                $unwind: { path: '$userInfo' }
            },
            {
                $lookup: {
                    from: 'periods',
                    foreignField: '_id',
                    localField: 'defenseMilestonesInfo.periodId',
                    as: 'periodInfo'
                }
            },
            {
                $unwind: { path: '$periodInfo' }
            },
            {
                $lookup: {
                    from: 'faculties',
                    foreignField: '_id',
                    localField: 'periodInfo.faculty',
                    as: 'facultyInfo'
                }
            },
            {
                $unwind: { path: '$facultyInfo' }
            },
            {
                $project: {
                    _id: 1,
                    defenseMilestone: '$defenseMilestonesInfo',
                    name: 1,
                    location: 1,
                    scheduledDate: 1,
                    topics: 1,
                    isCompleted: 1,
                    isPublished: 1,
                    createdBy: {
                        _id: '$userInfo._id',
                        fullName: '$userInfo.fullName',
                        email: '$userInfo.email',
                        avatarUrl: '$userInfo.avatarUrl',
                        avatarName: '$userInfo.avatarName'
                    },
                    periodInfo: {
                        _id: '$periodInfo._id',
                        year: '$periodInfo.year',
                        semester: '$periodInfo.semester',
                        currentPhase: '$periodInfo.currentPhase',
                        faculty: '$facultyInfo'
                    }
                }
            }
        )
        const council = await this.defenseCouncilModel.aggregate(pipeline).exec()
        if (!council || council.length === 0) {
            throw new NotFoundException('Không tìm thấy hội đồng bảo vệ')
        }

        return council[0]
    }

    // Cập nhật thông tin hội đồng
    async updateCouncil(councilId: string, dto: UpdateDefenseCouncilDto): Promise<DefenseCouncil> {
        const council = await this.defenseCouncilModel
            .findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(councilId), deleted_at: null },
                { $set: dto },
                { new: true }
            )
            .exec()

        if (!council) {
            throw new NotFoundException('Không tìm thấy hội đồng bảo vệ')
        }

        return council
    }

    // Xóa hội đồng (soft delete)
    async deleteCouncil(councilId: string): Promise<void> {
        const result = await this.defenseCouncilModel
            .updateOne(
                { _id: new mongoose.Types.ObjectId(councilId), deleted_at: null },
                { $set: { deleted_at: new Date() } }
            )
            .exec()

        if (result.matchedCount === 0) {
            throw new NotFoundException('Không tìm thấy hội đồng bảo vệ')
        }
    }

    // Thêm đề tài vào hội đồng
    async addTopicToCouncil(councilId: string, dto: AddTopicToCouncilDto): Promise<DefenseCouncil> {
        console.log('topicAssignment dto', dto)

        const councilDoc = await this.defenseCouncilModel.findOne({
            _id: new mongoose.Types.ObjectId(councilId),
            deleted_at: null
        })

        if (!councilDoc) {
            throw new NotFoundException('Không tìm thấy hội đồng bảo vệ')
        }

        // Kiểm tra đề tài đã tồn tại chưa
        const exists = councilDoc.topics.some((t) => t.topicId.toString() === dto.topicId)
        if (exists) {
            throw new BadRequestException('Đề tài đã được thêm vào hội đồng này')
        }

        // Validate: phải có 1 chủ tịch, 1 thư ký, 1 ủy viên, 1 phản biện
        const hasChairperson = dto.members.some((m) => m.role === 'chairperson')
        const hasSecretary = dto.members.some((m) => m.role === 'secretary')
        const hasMember = dto.members.some((m) => m.role === 'member')
        const hasReviewer = dto.members.some((m) => m.role === 'reviewer')

        if (!hasChairperson || !hasSecretary || !hasMember || !hasReviewer) {
            throw new BadRequestException('Phải có đủ 1 chủ tịch, 1 thư ký, 1 ủy viên và 1 phản biện')
        }

        if (dto.members.length !== 4) {
            throw new BadRequestException('Mỗi đề tài phải có đúng 4 giảng viên (1 phản biện + 3 hội đồng)')
        }

        const topicAssignment = {
            topicId: dto.topicId,
            titleVN: dto.titleVN,
            titleEng: dto.titleEng || '',
            studentNames: dto.studentNames || [],
            lecturerNames: dto.lecturerNames || [],
            members: dto.members,
            defenseOrder: dto.defenseOrder || councilDoc.topics.length + 1,
            scores: [],
            finalScore: undefined
        }
        console.log('topicAssignment', topicAssignment)
        councilDoc.topics.push(topicAssignment as any)
        return await councilDoc.save()
    }

    // Thêm nhiều đề tài vào hội đồng cùng lúc
    async addMultipleTopicsToCouncil(councilId: string, dto: AddMultipleTopicsToCouncilDto): Promise<DefenseCouncil> {
        const councilDoc = await this.defenseCouncilModel.findOne({
            _id: new mongoose.Types.ObjectId(councilId),
            deleted_at: null
        })

        if (!councilDoc) {
            throw new NotFoundException('Không tìm thấy hội đồng bảo vệ')
        }

        // Validate từng đề tài
        for (const topicDto of dto.topics) {
            // Kiểm tra đề tài đã tồn tại chưa
            const exists = councilDoc.topics.some((t) => t.topicId.toString() === topicDto.topicId)
            if (exists) {
                throw new BadRequestException(`Đề tài ${topicDto.titleVN} đã được thêm vào hội đồng này`)
            }

            // Validate: phải có 1 chủ tịch, 1 thư ký, 1 ủy viên, 1 phản biện
            const hasChairperson = topicDto.members.some((m) => m.role === 'chairperson')
            const hasSecretary = topicDto.members.some((m) => m.role === 'secretary')
            const hasMember = topicDto.members.some((m) => m.role === 'member')
            const hasReviewer = topicDto.members.some((m) => m.role === 'reviewer')

            if (!hasChairperson || !hasSecretary || !hasMember || !hasReviewer) {
                throw new BadRequestException(
                    `Đề tài ${topicDto.titleVN} phải có đủ 1 chủ tịch, 1 thư ký, 1 ủy viên và 1 phản biện`
                )
            }

            if (topicDto.members.length !== 4) {
                throw new BadRequestException(
                    `Đề tài ${topicDto.titleVN} phải có đúng 4 giảng viên (1 phản biện + 3 hội đồng)`
                )
            }
        }

        // Thêm tất cả đề tài
        const topicAssignments = dto.topics.map((topicDto) => ({
            topicId: topicDto.topicId,
            titleVN: topicDto.titleVN,
            titleEng: topicDto.titleEng || '',
            studentNames: topicDto.studentNames || [],
            lecturerNames: topicDto.lecturerNames || [],
            members: topicDto.members,
            defenseOrder: topicDto.defenseOrder || councilDoc.topics.length + 1,
            scores: [],
            finalScore: undefined
        }))

        councilDoc.topics.push(...(topicAssignments as any))
        return await councilDoc.save()
    }

    // Xóa đề tài khỏi hội đồng
    async removeTopicFromCouncil(councilId: string, topicId: string): Promise<DefenseCouncil> {
        const council = await this.defenseCouncilModel
            .findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(councilId), deleted_at: null },
                { $pull: { topics: { topicId: new mongoose.Types.ObjectId(topicId) } } },
                { new: true }
            )
            .exec()

        if (!council) {
            throw new NotFoundException('Không tìm thấy hội đồng bảo vệ')
        }

        return council
    }

    // Cập nhật bộ ba giảng viên cho đề tài
    async updateTopicMembers(councilId: string, topicId: string, dto: UpdateTopicMembersDto): Promise<DefenseCouncil> {
        // Validate bộ ba
        const hasChairperson = dto.members.some((m) => m.role === 'chairperson')
        const hasSecretary = dto.members.some((m) => m.role === 'secretary')
        const hasMember = dto.members.some((m) => m.role === 'member')

        if (!hasChairperson || !hasSecretary || !hasMember) {
            throw new BadRequestException('Bộ ba phải có 1 chủ tịch, 1 thư ký, 1 ủy viên, 1 phản biện')
        }

        if (dto.members.length !== 4) {
            throw new BadRequestException('Bộ ba phải có đúng 4 giảng viên')
        }

        const council = await this.defenseCouncilModel
            .findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(councilId),
                    'topics.topicId': new mongoose.Types.ObjectId(topicId),
                    deleted_at: null
                },
                { $set: { 'topics.$.members': dto.members } },
                { new: true }
            )
            .exec()

        if (!council) {
            throw new NotFoundException('Không tìm thấy hội đồng hoặc đề tài')
        }

        return council
    }

    // Cập nhật thứ tự bảo vệ
    async updateTopicOrder(councilId: string, topicId: string, defenseOrder: number): Promise<DefenseCouncil> {
        const council = await this.defenseCouncilModel.findOne({
            _id: new mongoose.Types.ObjectId(councilId),
            'topics.topicId': new mongoose.Types.ObjectId(topicId),
            deleted_at: null
        })

        if (!council) {
            throw new NotFoundException('Không tìm thấy hội đồng hoặc đề tài')
        }

        const topic = council.topics.find((t) => t.topicId.toString() === topicId)
        if (!topic) {
            throw new NotFoundException('Không tìm thấy đề tài trong hội đồng này')
        }

        const oldOrder = topic.defenseOrder

        // Nếu defenseOrder không đổi thì không làm gì
        if (oldOrder === defenseOrder) {
            return council
        }

        // Đổi thứ tự: cập nhật đề tài được chọn và hoán đổi với đề tài đang ở vị trí mới (nếu có)
        council.topics.forEach((t) => {
            if (t.topicId.toString() === topicId) {
                t.defenseOrder = defenseOrder
            } else if (t.defenseOrder === defenseOrder) {
                t.defenseOrder = oldOrder
            }
        })

        await council.save()
        return council
    }

    // Chấm điểm cho đề tài
    async submitScore(
        councilId: string,
        dto: SubmitScoreDto,
        scorerId: string,
        scorerName: string
    ): Promise<DefenseCouncil> {
        const council = await this.defenseCouncilModel.findOne({
            _id: new mongoose.Types.ObjectId(councilId),
            deleted_at: null
        })

        if (!council) {
            throw new NotFoundException('Không tìm thấy hội đồng bảo vệ')
        }

        const topicIndex = council.topics.findIndex((t) => t.topicId.toString() === dto.topicId)
        if (topicIndex === -1) {
            throw new NotFoundException('Không tìm thấy đề tài trong hội đồng này')
        }

        // Tính điểm tổng kết
        const score = {
            scorerId,
            scorerName,
            scoreType: dto.scoreType,
            total: dto.total,
            comment: dto.comment || '',
            scoredAt: new Date()
        }

        // Kiểm tra đã chấm chưa, nếu có thì update
        const existingScoreIndex = council.topics[topicIndex].scores.findIndex(
            (s) => s.scorerId.toString() === scorerId
        )

        if (existingScoreIndex !== -1) {
            council.topics[topicIndex].scores[existingScoreIndex] = score as any
        } else {
            council.topics[topicIndex].scores.push(score as any)
        }

        // Tính điểm tổng kết (trung bình tất cả điểm)
        const allScores = council.topics[topicIndex].scores
        if (allScores.length > 0) {
            const avgScore = allScores.reduce((sum, s) => sum + s.total, 0) / allScores.length
            council.topics[topicIndex].finalScore = Math.round(avgScore * 100) / 100
        }

        return await council.save()
    }

    // Lấy hội đồng của giảng viên
    async getCouncilsByLecturer(
        lecturerId: string,
        query: GetDefenseCouncilsQuery
    ): Promise<Paginated<DefenseCouncil>> {
        const lecturerObjectId = new mongoose.Types.ObjectId(lecturerId)
        const pipelineSub: any[] = []
        pipelineSub.push(
            {
                $match: {
                    deleted_at: null,
                    'topics.members.memberId': new mongoose.Types.ObjectId(lecturerId)
                }
            },
            {
                $sort: { scheduledDate: 1 }
            },
            {
                $lookup: {
                    from: 'milestones_templates',
                    foreignField: '_id',
                    localField: 'milestoneTemplateId',
                    as: 'defenseMilestonesInfo'
                }
            },
            {
                $unwind: { path: '$defenseMilestonesInfo' }
            },
            {
                $lookup: {
                    from: 'periods',
                    foreignField: '_id',
                    localField: 'defenseMilestonesInfo.periodId',
                    as: 'periodInfo'
                }
            },
            {
                $unwind: { path: '$periodInfo' }
            },
            {
                $lookup: {
                    from: 'faculties',
                    foreignField: '_id',
                    localField: 'periodInfo.faculty',
                    as: 'facultyInfo'
                }
            },
            {
                $unwind: { path: '$facultyInfo' }
            },
            {
                $addFields: {
                    yourRoles: {
                        $reduce: {
                            input: '$topics',
                            initialValue: [],
                            in: {
                                $concatArrays: [
                                    '$$value',
                                    // Với mỗi topic, filter để lấy members có memberId = lecturerId
                                    {
                                        $map: {
                                            input: {
                                                $filter: {
                                                    input: '$$this.members',
                                                    as: 'member',
                                                    cond: {
                                                        $eq: ['$$member.memberId', lecturerObjectId]
                                                    }
                                                }
                                            },
                                            as: 'filteredMember',
                                            // Lấy ra role của member đó
                                            in: '$$filteredMember.role'
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    yourRoles: { $setUnion: ['$yourRoles', []] } // Set operation để loại bỏ duplicate
                }
            },
            {
                $project: {
                    _id: 1,
                    defenseMilestone: {
                        title: '$defenseMilestonesInfo.title',
                        description: '$defenseMilestonesInfo.description'
                    },
                    periodInfo: {
                        _id: '$periodInfo._id',
                        year: '$periodInfo.year',
                        semester: '$periodInfo.semester',
                        currentPhase: '$periodInfo.currentPhase',
                        faculty: '$facultyInfo'
                    },
                    name: 1,
                    location: 1,
                    scheduledDate: 1,
                    topicsNum: { $size: '$topics' },
                    isCompleted: 1,
                    isPublished: 1,
                    createdBy: 1,
                    yourRoles: 1
                }
            }
        )
        return await this.paginationQuery.paginateQuery<DefenseCouncil>(query, this.defenseCouncilModel, pipelineSub)
    }

    // Lấy điểm của đề tài
    async getTopicScores(councilId: string, topicId: string): Promise<any> {
        const council = await this.getCouncilById(councilId)

        const topic = council.topics.find((t) => t.topicId.toString() === topicId)
        if (!topic) {
            throw new NotFoundException('Không tìm thấy đề tài trong hội đồng này')
        }

        return {
            topicId: topic.topicId,
            titleVN: topic.titleVN,
            scores: topic.scores,
            finalScore: topic.finalScore
        }
    }
    async getDetailScoringDefenseCouncil(councilId: string, lecturerId?: string): Promise<DefenseCouncil> {
        const pipeline: any = []
        pipeline.push(
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(councilId),
                    ...(lecturerId && { 'topics.members.memberId': new mongoose.Types.ObjectId(lecturerId) }),
                    deleted_at: null
                }
            },
            {
                $lookup: {
                    from: 'milestones_templates',
                    foreignField: '_id',
                    localField: 'milestoneTemplateId',
                    as: 'defenseMilestonesInfo'
                }
            },
            {
                $unwind: { path: '$defenseMilestonesInfo' }
            },
            {
                $lookup: {
                    from: 'users',
                    foreignField: '_id',
                    localField: 'createdBy',
                    as: 'userInfo'
                }
            },
            {
                $unwind: { path: '$userInfo' }
            },
            {
                $addFields: {
                    topics: {
                        $map: {
                            input: '$topics',
                            as: 'topic',
                            in: {
                                $mergeObjects: [
                                    '$$topic',
                                    {
                                        isAssigned: {
                                            $cond: {
                                                if: {
                                                    $eq: [
                                                        {
                                                            $size: {
                                                                $filter: {
                                                                    input: '$$topic.members',
                                                                    as: 'member',
                                                                    cond: {
                                                                        $eq: [
                                                                            '$$member.memberId',
                                                                            new mongoose.Types.ObjectId(lecturerId)
                                                                        ]
                                                                    }
                                                                }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                },
                                                then: false,
                                                else: true
                                            }
                                        },
                                        yourRoles: {
                                            $map: {
                                                input: {
                                                    $filter: {
                                                        input: '$$topic.members',
                                                        as: 'member',
                                                        cond: {
                                                            $eq: [
                                                                '$$member.memberId',
                                                                new mongoose.Types.ObjectId(lecturerId)
                                                            ]
                                                        }
                                                    }
                                                },
                                                as: 'mem',
                                                in: '$$mem.role'
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'periods',
                    foreignField: '_id',
                    localField: 'defenseMilestonesInfo.periodId',
                    as: 'periodInfo'
                }
            },
            {
                $unwind: { path: '$periodInfo' }
            },
            {
                $lookup: {
                    from: 'faculties',
                    foreignField: '_id',
                    localField: 'periodInfo.faculty',
                    as: 'facultyInfo'
                }
            },
            {
                $unwind: { path: '$facultyInfo' }
            },
            {
                $project: {
                    _id: 1,
                    defenseMilestone: '$defenseMilestonesInfo',
                    name: 1,
                    location: 1,
                    scheduledDate: 1,
                    topics: 1,
                    isCompleted: 1,
                    isPublished: 1,
                    createdBy: {
                        _id: '$userInfo._id',
                        fullName: '$userInfo.fullName',
                        email: '$userInfo.email',
                        avatarUrl: '$userInfo.avatarUrl',
                        avatarName: '$userInfo.avatarName'
                    },
                    periodInfo: {
                        _id: '$periodInfo._id',
                        year: '$periodInfo.year',
                        semester: '$periodInfo.semester',
                        currentPhase: '$periodInfo.currentPhase',
                        faculty: '$facultyInfo'
                    }
                }
            }
        )
        const res = await this.defenseCouncilModel.aggregate(pipeline).exec()
        return res[0]
    }

    // Thư ký nhập điểm cho đề tài (tất cả thành viên cùng lúc)
    async submitTopicScores(
        councilId: string,
        topicId: string,
        dto: SubmitTopicScoresDto,
        submittedBy: string
    ): Promise<DefenseCouncil> {
        const council = await this.defenseCouncilModel.findOne({
            _id: new mongoose.Types.ObjectId(councilId),
            deleted_at: null
        })

        if (!council) {
            throw new NotFoundException('Không tìm thấy hội đồng bảo vệ')
        }

        if (council.isCompleted) {
            throw new BadRequestException('Hội đồng đã được khóa, không thể sửa điểm')
        }

        const topicIndex = council.topics.findIndex((t) => t.topicId.toString() === topicId)
        if (topicIndex === -1) {
            throw new NotFoundException('Không tìm thấy đề tài trong hội đồng này')
        }

        if (council.topics[topicIndex].isLocked) {
            throw new BadRequestException('Điểm đề tài này đã được khóa')
        }

        // Thay thế toàn bộ điểm với điểm mới
        council.topics[topicIndex].scores = dto.scores.map((score) => ({
            scorerId: score.scorerId,
            scorerName: score.scorerName,
            scoreType: score.scoreType,
            total: score.total,
            comment: score.comment || '',
            scoredAt: new Date(),
            lastModifiedBy: submittedBy,
            lastModifiedAt: new Date()
        })) as any

        // Tính điểm tổng kết (trung bình tất cả điểm)
        const allScores = council.topics[topicIndex].scores
        if (allScores.length > 0) {
            const supervisorScore = allScores.find((s) => s.scoreType === 'supervisor')
            const reviewerScore = allScores.find((s) => s.scoreType === 'reviewer')
            const secretaryScore = allScores.find((s) => s.scoreType === 'secretary')
            const chairpersonScore = allScores.find((s) => s.scoreType === 'chairperson')

            // Công thức: ((supervisor + reviewer) * 2 + secretary + chairperson) / 6
            const supervisor = supervisorScore?.total || 0
            const reviewer = reviewerScore?.total || 0
            const secretary = secretaryScore?.total || 0
            const chairperson = chairpersonScore?.total || 0

            const weightedTotal = (supervisor + reviewer) * 2 + secretary + chairperson
            council.topics[topicIndex].finalScore = Math.round((weightedTotal / 6) * 100) / 100

            // Xếp loại (giữ nguyên)
            const finalScore = council.topics[topicIndex].finalScore
            if (finalScore >= 9.0) {
                council.topics[topicIndex].gradeText = 'Xuất sắc'
            } else if (finalScore >= 8.0) {
                council.topics[topicIndex].gradeText = 'Giỏi'
            } else if (finalScore >= 7.0) {
                council.topics[topicIndex].gradeText = 'Khá'
            } else if (finalScore >= 5.5) {
                council.topics[topicIndex].gradeText = 'Trung bình'
            } else if (finalScore >= 4.0) {
                council.topics[topicIndex].gradeText = 'Yếu'
            } else {
                council.topics[topicIndex].gradeText = 'Kém'
            }
        }

        return await council.save()
    }

    // Khóa điểm một đề tài
    async lockTopicScores(councilId: string, topicId: string): Promise<DefenseCouncil> {
        const council = await this.defenseCouncilModel.findOne({
            _id: new mongoose.Types.ObjectId(councilId),
            deleted_at: null
        })

        if (!council) {
            throw new NotFoundException('Không tìm thấy hội đồng bảo vệ')
        }

        const topicIndex = council.topics.findIndex((t) => t.topicId.toString() === topicId)
        if (topicIndex === -1) {
            throw new NotFoundException('Không tìm thấy đề tài trong hội đồng này')
        }

        council.topics[topicIndex].isLocked = true
        return await council.save()
    }

    // Mở khóa điểm một đề tài (BCN)
    async unlockTopicScores(councilId: string, topicId: string): Promise<DefenseCouncil> {
        const council = await this.defenseCouncilModel.findOne({
            _id: new mongoose.Types.ObjectId(councilId),
            deleted_at: null
        })

        if (!council) {
            throw new NotFoundException('Không tìm thấy hội đồng bảo vệ')
        }

        const topicIndex = council.topics.findIndex((t) => t.topicId.toString() === topicId)
        if (topicIndex === -1) {
            throw new NotFoundException('Không tìm thấy đề tài trong hội đồng này')
        }

        council.topics[topicIndex].isLocked = false
        return await council.save()
    }

    // Khóa hội đồng (Thư ký/BCN)
    async completeCouncil(councilId: string, userId: string): Promise<DefenseCouncil> {
        const council = await this.defenseCouncilModel.findOne({
            _id: new mongoose.Types.ObjectId(councilId),
            deleted_at: null
        })

        if (!council) {
            throw new NotFoundException('Không tìm thấy hội đồng bảo vệ')
        }

        // Kiểm tra tất cả đề tài đã có điểm chưa
        const topicsWithoutScores = council.topics.filter((t) => !t.scores || t.scores.length === 0)
        if (topicsWithoutScores.length > 0) {
            throw new BadRequestException(
                `Còn ${topicsWithoutScores.length} đề tài chưa có điểm. Vui lòng nhập điểm trước khi khóa hội đồng.`
            )
        }

        // Khóa tất cả đề tài
        council.topics.forEach((topic) => {
            topic.isLocked = true
        })

        council.isCompleted = true
        council.completedBy = userId as any
        council.completedAt = new Date()

        return await council.save()
    }

    // Công bố điểm (BCN)
    async publishCouncil(councilId: string, userId: string): Promise<DefenseCouncil> {
        const council = await this.defenseCouncilModel.findOne({
            _id: new mongoose.Types.ObjectId(councilId),
            deleted_at: null
        })

        if (!council) {
            throw new NotFoundException('Không tìm thấy hội đồng bảo vệ')
        }

        if (!council.isCompleted) {
            throw new BadRequestException('Hội đồng chưa được khóa, không thể công bố điểm')
        }

        council.isPublished = true
        council.publishedBy = userId as any
        council.publishedAt = new Date()

        const savedCouncil = await council.save()
        return savedCouncil
    }

    async getStudentDefenseScores(studentId: string) {
        const councils = await this.defenseCouncilModel
            .aggregate([
                {
                    $match: {
                        isPublished: true,
                        deleted_at: null
                    }
                },
                {
                    $lookup: {
                        from: 'ref_students_topics',
                        let: { studentId: new mongoose.Types.ObjectId(studentId) },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: ['$userId', '$$studentId']
                                            },
                                            {
                                                $eq: ['status', StudentRegistrationStatus.APPROVED]
                                            }
                                        ]
                                    }
                                }
                            },
                            {
                                $project: {
                                    topicId: 1
                                }
                            }
                        ],
                        as: 'studentTopics'
                    }
                },
                {
                    $match: {
                        $expr: {
                            $gt: [{ $size: '$studentTopics' }, 0]
                        }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        location: 1,
                        scheduledDate: 1,
                        topics: 1,
                        stuTopicIds: {
                            $map: {
                                input: '$studentTopics',
                                as: 'stuRef',
                                in: '$$stuRef.topicId'
                            }
                        }
                    }
                }
            ])
            .exec()
        let result = []
        for (const council of councils) {
            for (const topic of council.topics) {
                // result.push({
                //     councilName: council.name,
                //     location: council.location,
                //     defenseDate: council.scheduledDate,
                //     topicTitle: topic.titleVN,
                //     finalScore: topic.finalScore,
                //     gradeText: topic.gradeText,
                //     scores: topic.scores,
                //     isPublished: council.isPublished
                // })
            }
        }

        return councils
    }

    async exportScoresTemplate(councilId: string, includeScores: boolean = false): Promise<Buffer> {
        const ExcelJS = require('exceljs')
        const council = await this.getCouncilById(councilId)

        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Bảng điểm')

        // Header info
        worksheet.addRow(['HỘI ĐỒNG BẢO VỆ', council.name])
        worksheet.addRow(['Ngày bảo vệ', new Date(council.scheduledDate).toLocaleDateString('vi-VN')])
        worksheet.addRow(['Địa điểm', council.location])
        worksheet.addRow([]) // Empty row

        // Define columns
        const columns: any[] = [
            { header: 'STT', key: 'order', width: 8 },
            { header: 'Tên đề tài', key: 'titleVN', width: 40 },
            { header: 'Sinh viên', key: 'students', width: 25 }
        ]

        // Dynamically add columns for each topic's members
        const roleLabels = {
            supervisor: 'GVHD',
            reviewer: 'GVPB',
            secretary: 'Thư ký',
            chairperson: 'Chủ tịch',
            member: 'Ủy viên'
        }

        // Add score columns (each topic has different members)
        Object.keys(roleLabels).forEach((role) => {
            columns.push(
                { header: roleLabels[role], key: `${role}_score`, width: 12 },
                { header: `Ghi chú ${roleLabels[role]}`, key: `${role}_comment`, width: 20 }
            )
        })

        columns.push(
            { header: 'Điểm TB\n(Công thức)', key: 'finalScore', width: 12 },
            { header: 'Xếp loại', key: 'gradeText', width: 12 }
        )

        worksheet.addRow([]) // For header
        const headerRow = worksheet.lastRow
        columns.forEach((col, idx) => {
            headerRow.getCell(idx + 1).value = col.header
            headerRow.getCell(idx + 1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
            headerRow.getCell(idx + 1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            }
            headerRow.getCell(idx + 1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        })
        headerRow.height = 40

        // Add data rows
        council.topics
            .sort((a, b) => (a.defenseOrder || 0) - (b.defenseOrder || 0))
            .forEach((topic, index) => {
                const row: any = {
                    order: topic.defenseOrder || index + 1,
                    titleVN: topic.titleVN,
                    students: topic.studentNames.join(', ')
                }

                // Add member names and scores
                topic.members.forEach((member) => {
                    const role = member.role
                    const score = includeScores
                        ? topic.scores.find((s) => s.scorerId.toString() === member.memberId.toString())
                        : null

                    row[`${role}_score`] = score?.total || ''
                    row[`${role}_comment`] = score?.comment || ''
                })

                if (includeScores) {
                    row.finalScore = topic.finalScore || ''
                    row.gradeText = topic.gradeText || ''
                } else {
                    row.finalScore = '' // Will be calculated
                    row.gradeText = ''
                }

                const dataRow = worksheet.addRow(row)
                dataRow.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    }
                    cell.alignment = { vertical: 'middle', horizontal: 'center' }
                })
            })

        // Add formula note
        worksheet.addRow([])
        const formulaRow = worksheet.addRow(['', 'Công thức tính điểm: ((GVHD + GVPB) × 2 + Thư ký + Chủ tịch) / 6'])
        formulaRow.getCell(2).font = { italic: true, color: { argb: 'FF666666' } }
        worksheet.mergeCells(formulaRow.number, 2, formulaRow.number, 5)

        return await workbook.xlsx.writeBuffer()
    }

    async importScoresFromExcel(councilId: string, data: any[], userId: string) {
        const council = await this.defenseCouncilModel.findOne({
            _id: new mongoose.Types.ObjectId(councilId),
            deleted_at: null
        })

        if (!council) {
            throw new NotFoundException('Không tìm thấy hội đồng')
        }

        if (council.isCompleted) {
            throw new BadRequestException('Hội đồng đã khóa')
        }

        let successCount = 0
        const errors: string[] = []

        for (const row of data) {
            try {
                const topicIndex = council.topics.findIndex((t) => t.titleVN === row.titleVN)

                if (topicIndex === -1) {
                    errors.push(`Không tìm thấy: ${row.titleVN}`)
                    continue
                }

                if (council.topics[topicIndex].isLocked) {
                    errors.push(`Đã khóa: ${row.titleVN}`)
                    continue
                }

                const topic = council.topics[topicIndex]
                const scores: any[] = []

                // Parse scores from each role
                topic.members.forEach((member) => {
                    const role = member.role
                    const scoreValue = parseFloat(row[`${role}_score`])

                    if (!isNaN(scoreValue) && scoreValue >= 0 && scoreValue <= 10) {
                        scores.push({
                            scorerId: member.memberId,
                            scorerName: member.fullName,
                            scoreType: role,
                            total: scoreValue,
                            comment: row[`${role}_comment`] || '',
                            scoredAt: new Date(),
                            lastModifiedBy: userId,
                            lastModifiedAt: new Date()
                        })
                    }
                })

                if (scores.length === 0) {
                    errors.push(`Không có điểm hợp lệ: ${row.titleVN}`)
                    continue
                }

                // Update scores
                council.topics[topicIndex].scores = scores as any

                // Calculate finalScore with new formula
                const supervisor = scores.find((s) => s.scoreType === 'supervisor')?.total || 0
                const reviewer = scores.find((s) => s.scoreType === 'reviewer')?.total || 0
                const secretary = scores.find((s) => s.scoreType === 'secretary')?.total || 0
                const chairperson = scores.find((s) => s.scoreType === 'chairperson')?.total || 0

                const weightedTotal = (supervisor + reviewer) * 2 + secretary + chairperson
                council.topics[topicIndex].finalScore = Math.round((weightedTotal / 6) * 100) / 100

                // Calculate grade
                const finalScore = council.topics[topicIndex].finalScore
                if (finalScore >= 9.0) council.topics[topicIndex].gradeText = 'Xuất sắc'
                else if (finalScore >= 8.0) council.topics[topicIndex].gradeText = 'Giỏi'
                else if (finalScore >= 7.0) council.topics[topicIndex].gradeText = 'Khá'
                else if (finalScore >= 5.5) council.topics[topicIndex].gradeText = 'Trung bình'
                else if (finalScore >= 4.0) council.topics[topicIndex].gradeText = 'Yếu'
                else council.topics[topicIndex].gradeText = 'Kém'

                successCount++
            } catch (error) {
                errors.push(`Lỗi: ${row.titleVN} - ${error.message}`)
            }
        }

        await council.save()

        return {
            totalCount: data.length,
            successCount,
            errorCount: data.length - successCount,
            errors
        }
    }
}
