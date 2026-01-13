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
    GetDefenseCouncilsQuery
} from '../dtos/defense-council.dto'
import { PaginationAnModule } from '../../../common/pagination-an/pagination.module'
import { PaginationProvider } from '../../../common/pagination-an/providers/pagination.provider'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { pipeline } from 'stream'

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
            }
        )
        pipelineSub.push({
            $project: {
                _id: 1,
                milestoneTemplateId: 1,
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
        })

        return await this.paginationQuery.paginateQuery<DefenseCouncil>(query, this.defenseCouncilModel, pipelineSub)
    }

    // Lấy chi tiết hội đồng
    async getCouncilById(councilId: string): Promise<DefenseCouncil> {
        const council = await this.defenseCouncilModel
            .findOne({ _id: new mongoose.Types.ObjectId(councilId), deleted_at: null })
            .exec()

        if (!council) {
            throw new NotFoundException('Không tìm thấy hội đồng bảo vệ')
        }

        return council
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
            members: dto.members,
            defenseOrder: dto.defenseOrder || councilDoc.topics.length + 1,
            scores: [],
            finalScore: undefined
        }

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
            throw new BadRequestException('Bộ ba phải có 1 chủ tịch, 1 thư ký, 1 ủy viên')
        }

        if (dto.members.length !== 3) {
            throw new BadRequestException('Bộ ba phải có đúng 3 giảng viên')
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
        const council = await this.defenseCouncilModel
            .findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(councilId),
                    'topics.topicId': new mongoose.Types.ObjectId(topicId),
                    deleted_at: null
                },
                { $set: { 'topics.$.defenseOrder': defenseOrder } },
                { new: true }
            )
            .exec()

        if (!council) {
            throw new NotFoundException('Không tìm thấy hội đồng hoặc đề tài')
        }

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
        const pipelineSub: any[] = []
        pipelineSub.push(
            {
                $match: { deleted_at: null },
                'topics.members.memberId': new mongoose.Types.ObjectId(lecturerId)
            },
            {
                $sort: { scheduledDate: 1 }
            },
            {
                $project: {
                    milestoneTemplateId: 1,
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
}
