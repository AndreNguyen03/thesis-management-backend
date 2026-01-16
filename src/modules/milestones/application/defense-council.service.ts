import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { DefenseCouncilRepository } from '../repository/defense-council.repository'
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
import { SaveDraftScoreDto, SubmitDetailedScoreDto } from '../dtos/detailed-score.dto'
import { DefenseCouncil } from '../schemas/defense-council.schema'
import { DraftScore } from '../schemas/draft-score.schema'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { TranferStatusAndAddPhaseHistoryProvider } from '../../topics/providers/tranfer-status-and-add-phase-history.provider'
import { TopicStatus } from '../../topics/enum'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { DefensePdfProvider } from '../providers/defense-pdf.provider'
import { DefenseAnalyticsProvider, CouncilAnalytics } from '../providers/defense-analytics.provider'
import { UserService } from '../../../users/application/users.service'
import { MailService } from '../../../mail/providers/mail.service'
import { StudentRegisterTopic } from '../../registrations/schemas/ref_students_topics.schemas'
import { EvaluationTemplateService } from '../../evaluation-templates/evaluation-template.service'
import mongoose from 'mongoose'
import { toScoreState } from '../utils/score-calculator.util'

@Injectable()
export class DefenseCouncilService {
    constructor(
        private readonly defenseCouncilRepository: DefenseCouncilRepository,
        private readonly tranferStatusAndAddHistory: TranferStatusAndAddPhaseHistoryProvider,
        private readonly defensePdfProvider: DefensePdfProvider,
        private readonly defenseAnalyticsProvider: DefenseAnalyticsProvider,
        private readonly userService: UserService,
        private readonly mailService: MailService,
        private readonly evaluationTemplateService: EvaluationTemplateService,
        @InjectModel(StudentRegisterTopic.name)
        private readonly studentRegisterTopicModel: Model<StudentRegisterTopic>,
        @InjectModel(DraftScore.name)
        private readonly draftScoreModel: Model<DraftScore>
    ) {}

    // Tạo hội đồng mới
    async createCouncil(dto: CreateDefenseCouncilDto, userId: string): Promise<DefenseCouncil> {
        return await this.defenseCouncilRepository.createCouncil(dto, userId)
    }

    // Lấy danh sách hội đồng
    async getCouncils(query: GetDefenseCouncilsQuery): Promise<Paginated<DefenseCouncil>> {
        return await this.defenseCouncilRepository.getCouncils(query)
    }

    // Lấy chi tiết hội đồng
    async getCouncilById(councilId: string): Promise<DefenseCouncil> {
        return await this.defenseCouncilRepository.getCouncilById(councilId)
    }

    // Cập nhật thông tin hội đồng
    async updateCouncil(councilId: string, dto: UpdateDefenseCouncilDto): Promise<DefenseCouncil> {
        return await this.defenseCouncilRepository.updateCouncil(councilId, dto)
    }

    // Xóa hội đồng
    async deleteCouncil(councilId: string): Promise<void> {
        await this.defenseCouncilRepository.deleteCouncil(councilId)
    }

    // Thêm đề tài vào hội đồng
    async addTopicToCouncil(councilId: string, dto: AddTopicToCouncilDto): Promise<DefenseCouncil> {
        return await this.defenseCouncilRepository.addTopicToCouncil(councilId, dto)
    }

    // Thêm nhiều đề tài vào hội đồng cùng lúc
    async addMultipleTopicsToCouncil(
        userId: string,
        councilId: string,
        dto: AddMultipleTopicsToCouncilDto
    ): Promise<DefenseCouncil> {
        const result = await this.defenseCouncilRepository.addMultipleTopicsToCouncil(councilId, dto)

        for (const topic of dto.topics) {
            await this.tranferStatusAndAddHistory.transferStatusAndAddPhaseHistory(
                topic.topicId,
                TopicStatus.AssignedDefense,
                userId,
                'Đề tài được thêm vào hội đồng bảo vệ'
            )
        }
        console.log('Đã phân công ', dto.topics.length, ' đề tài vào hội đồng bảo vệ.')
        return result
    }

    // Xóa đề tài khỏi hội đồng
    async removeTopicFromCouncil(userId: string, councilId: string, topicId: string): Promise<DefenseCouncil> {
        const result = await this.defenseCouncilRepository.removeTopicFromCouncil(councilId, topicId)
        await this.tranferStatusAndAddHistory.transferStatusAndAddPhaseHistory(
            topicId,
            TopicStatus.AwaitingEvaluation,
            userId,
            'Đề tài bị loại bỏ khỏi hội đồng bảo vệ'
        )
        return result
    }

    // Cập nhật bộ ba giảng viên cho đề tài
    async updateTopicMembers(councilId: string, topicId: string, dto: UpdateTopicMembersDto): Promise<DefenseCouncil> {
        return await this.defenseCouncilRepository.updateTopicMembers(councilId, topicId, dto)
    }

    // Cập nhật thứ tự bảo vệ
    async updateTopicOrder(councilId: string, topicId: string, defenseOrder: number): Promise<DefenseCouncil> {
        return await this.defenseCouncilRepository.updateTopicOrder(councilId, topicId, defenseOrder)
    }

    // Chấm điểm
    async submitScore(
        councilId: string,
        dto: SubmitScoreDto,
        scorerId: string,
        scorerName: string
    ): Promise<DefenseCouncil> {
        return await this.defenseCouncilRepository.submitScore(councilId, dto, scorerId, scorerName)
    }

    // Lấy hội đồng của giảng viên
    async getCouncilsByLecturer(
        lecturerId: string,
        query: GetDefenseCouncilsQuery
    ): Promise<Paginated<DefenseCouncil>> {
        return await this.defenseCouncilRepository.getCouncilsByLecturer(lecturerId, query)
    }

    // Lấy điểm của đề tài
    async getTopicScores(councilId: string, topicId: string): Promise<any> {
        return await this.defenseCouncilRepository.getTopicScores(councilId, topicId)
    }

    // Công bố điểm
    async publishScores(councilId: string): Promise<DefenseCouncil> {
        return await this.defenseCouncilRepository.updateCouncil(councilId, { isPublished: true })
    }

    // Khóa hội đồng (hoàn thành)
    async completeCouncil(councilId: string): Promise<DefenseCouncil> {
        return await this.defenseCouncilRepository.updateCouncil(councilId, { isCompleted: true })
    }
    // lấy danh sách các hội đồng mà người này được phân công chấm
    // hiển thị cả đề tài không được phân công nhưng không active
    async getDetailScoringDefenseCouncil(councilId: string, lecturerId?: string) {
        return await this.defenseCouncilRepository.getDetailScoringDefenseCouncil(councilId, lecturerId)
    }

    // Thư ký nhập điểm cho đề tài (tất cả thành viên cùng lúc)
    async submitTopicScores(
        councilId: string,
        topicId: string,
        dto: SubmitTopicScoresDto,
        userId: string
    ): Promise<DefenseCouncil> {
        return await this.defenseCouncilRepository.submitTopicScores(councilId, topicId, dto, userId)
    }

    // Khóa điểm một đề tài
    async lockTopicScores(councilId: string, topicId: string): Promise<DefenseCouncil> {
        return await this.defenseCouncilRepository.lockTopicScores(councilId, topicId)
    }

    // Mở khóa điểm một đề tài (BCN)
    async unlockTopicScores(councilId: string, topicId: string): Promise<DefenseCouncil> {
        return await this.defenseCouncilRepository.unlockTopicScores(councilId, topicId)
    }

    // Khóa hội đồng (Thư ký/BCN) - Cập nhật để dùng repository method mới
    async completeCouncilWithValidation(councilId: string, userId: string): Promise<DefenseCouncil> {
        return await this.defenseCouncilRepository.completeCouncil(councilId, userId)
    }

    // Công bố điểm (BCN)
    async publishCouncilScores(councilId: string, userId: string): Promise<DefenseCouncil> {
        const council = await this.defenseCouncilRepository.publishCouncil(councilId, userId)

        // Send emails to students
        const roleLabels = {
            chairperson: 'Chủ tịch',
            secretary: 'Thư ký',
            member: 'Ủy viên',
            reviewer: 'Phản biện',
            supervisor: 'GVHD'
        }

        // Gửi email cho từng đề tài
        for (const topic of council.topics) {
            try {
                // Lấy danh sách sinh viên từ ref_students_topics
                const studentRefs = await this.studentRegisterTopicModel
                    .find({
                        topicId: new mongoose.Types.ObjectId(topic.topicId.toString()),
                        status: 'approved'
                    })
                    .exec()

                const studentIds = studentRefs.map((ref) => ref.userId.toString())

                if (studentIds.length === 0) {
                    console.warn(`Không tìm thấy sinh viên cho đề tài ${topic.titleVN}`)
                    continue
                }

                // Lấy thông tin user
                const students = await Promise.all(studentIds.map((id) => this.userService.findById(id)))

                const validStudents = students.filter((s) => s !== null)

                if (validStudents.length === 0) {
                    console.warn(`Không tìm thấy thông tin user cho đề tài ${topic.titleVN}`)
                    continue
                }

                // Format scores
                const scores = topic.scores.map((s) => ({
                    roleLabel: roleLabels[s.scoreType] || s.scoreType,
                    scorerName: s.scorerName,
                    total: s.total,
                    comment: s.comment || ''
                }))

                // Gửi email
                await this.mailService.sendDefenseScoresPublished({
                    students: validStudents,
                    topicTitle: topic.titleVN,
                    councilName: council.name,
                    location: council.location,
                    defenseDate: council.scheduledDate,
                    finalScore: topic.finalScore || 0,
                    gradeText: topic.gradeText || 'Chưa xếp loại',
                    scores,
                    facultyName: 'Khoa' // TODO: Lấy từ period.faculty nếu cần
                })

                console.log(`✅ Đã gửi email điểm cho ${validStudents.length} sinh viên - Đề tài: ${topic.titleVN}`)
            } catch (error) {
                console.error(`❌ Lỗi khi gửi email cho đề tài ${topic.titleVN}:`, error)
                // Không throw error để không làm gián đoạn quá trình công bố
            }
        }

        return council
    }

    async getStudentDefenseScores(studentId: string) {
        return await this.defenseCouncilRepository.getStudentDefenseScores(studentId)
    }
    async exportScoresTemplate(councilId: string, includeScores: boolean = false) {
        return await this.defenseCouncilRepository.exportScoresTemplate(councilId, includeScores)
    }
    async importScoresFromExcel(councilId: string, data: any[], userId: string) {
        return await this.defenseCouncilRepository.importScoresFromExcel(councilId, data, userId)
    }

    // Phase 4: PDF Generation
    async generateCouncilPdfReport(councilId: string): Promise<Buffer> {
        return await this.defensePdfProvider.generateCouncilReport(councilId)
    }

    async generateTopicScoreCard(councilId: string, topicId: string): Promise<Buffer> {
        return await this.defensePdfProvider.generateTopicScoreCard(councilId, topicId)
    }

    // Phase 4: Analytics
    async getCouncilAnalytics(councilId: string): Promise<CouncilAnalytics> {
        return await this.defenseAnalyticsProvider.getCouncilAnalytics(councilId)
    }

    // ==================== DETAILED SCORING METHODS ====================

    /**
     * Lưu nháp điểm chi tiết (draft) - chưa submit chính thức
     * Auto-save mỗi 3s từ frontend, lưu vào DB + localStorage
     */
    async saveDraftScore(
        councilId: string,
        topicId: string,
        scorerId: string,
        dto: SaveDraftScoreDto
    ): Promise<DraftScore> {
        // Upsert draft (update nếu có, create nếu chưa)
        const filter = {
            councilId,
            topicId,
            scorerId,
            studentId: dto.studentId || null
        }

        const draft = await this.draftScoreModel.findOneAndUpdate(
            filter,
            {
                $set: {
                    detailedScores: dto.detailedScores,
                    comment: dto.comment || '',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Reset expiry
                }
            },
            { upsert: true, new: true }
        )

        return draft
    }

    /**
     * Load draft score của user hiện tại
     */
    async getMyDraft(
        councilId: string,
        topicId: string,
        scorerId: string,
        studentId?: string
    ): Promise<DraftScore | null> {
        return await this.draftScoreModel
            .findOne({
                councilId,
                topicId,
                scorerId,
                studentId: studentId || null
            })
            .exec()
    }

    /**
     * Submit điểm chi tiết chính thức
     * - Validate với EvaluationTemplate
     * - Tính toán weighted score
     * - Xóa draft sau khi submit
     */
    async submitDetailedScore(
        councilId: string,
        topicId: string,
        scorerId: string,
        dto: SubmitDetailedScoreDto,
        isFaculty?: boolean
    ): Promise<DefenseCouncil> {
        // 1. Get council và validate
        const council = await this.defenseCouncilRepository.getCouncilById(councilId)
        if (council.isCompleted) {
            throw new BadRequestException('Hội đồng đã hoàn thành, không thể chấm điểm')
        }

        const topic = council.topics.find((t) => t.topicId.toString() === topicId)
        if (!topic) {
            throw new BadRequestException('Không tìm thấy đề tài trong hội đồng')
        }

        if (topic.isLocked) {
            throw new BadRequestException('Đề tài đã bị khóa điểm')
        }

        // 2. Validate detailedScores với template (nếu có)
        if (council.evaluationTemplateId) {
            const validation = await this.evaluationTemplateService.validateDetailedScores(
                council.evaluationTemplateId,
                dto.detailedScores
            )

            if (!validation.isValid) {
                throw new Error(`Điểm không hợp lệ: ${validation.errors.join(', ')}`)
            }
        }

        // 3. Validate total score = sum of MAIN criterion scores only (không có subcriterionId)
        const calculatedTotal = dto.detailedScores
            .filter((score) => !score.subcriterionId) // Chỉ lấy main criterion
            .reduce((sum, score) => sum + score.score, 0)

        if (Math.abs(calculatedTotal - dto.totalScore) > 0.01) {
            throw new Error(`Tổng điểm không khớp: ${dto.totalScore} vs ${calculatedTotal}`)
        }
        // 4. Find or get scorer info
        const member = topic.members.find((m) => m.memberId.toString() === scorerId)
        if (!member && !isFaculty) {
            throw new Error('Bạn không phải thành viên của hội đồng chấm đề tài này')
        }

        // 5. Submit score (replace existing score nếu có)
        console.log('Submitting detailed score for topic', topic.scores)
        const existingScoreIndex = topic.scores?.findIndex(
            (s) => s.scorerId.toString() === scorerId && (dto.studentId ? s.studentId === dto.studentId : !s.studentId)
        )

        const newScore = {
            scorerId,
            scorerName: member?.fullName,
            scoreType: member?.role as any,
            total: dto.totalScore,
            comment: dto.comment || '',
            detailedScores: dto.detailedScores,
            studentId: dto.studentId,
            scoredAt: new Date(),
            lastModifiedBy: scorerId,
            lastModifiedAt: new Date()
        }

        if (existingScoreIndex >= 0) {
            topic.scores[existingScoreIndex] = newScore as any
        } else {
            topic.scores.push(newScore as any)
        }

        // 6. Save to DB
        await this.defenseCouncilRepository.updateCouncil(councilId, {
            topics: council.topics
        } as any)

        // 7. Delete draft sau khi submit thành công
        await this.draftScoreModel.deleteOne({
            councilId,
            topicId,
            scorerId,
            studentId: dto.studentId || null
        })

        return await this.defenseCouncilRepository.getCouncilById(councilId)
    }

    /**
     * Delete draft manually (nếu user muốn discard)
     */
    async deleteDraft(councilId: string, topicId: string, scorerId: string, studentId?: string): Promise<void> {
        await this.draftScoreModel.deleteOne({
            councilId,
            topicId,
            scorerId,
            studentId: studentId || null
        })
    }

    /**
     * Lấy điểm mà user đã chấm cho topic (nếu đã submit)
     */
    async getMyScoreForTopic(councilId: string, topicId: string, scorerId: string, studentId?: string): Promise<any> {
        console.log(
            'Getting my score for topic',
            'councilId',
            councilId,
            'topicId',
            topicId,
            'scorerId',
            scorerId,
            'studentId',
            studentId
        )
        const council = await this.defenseCouncilRepository.getCouncilById(councilId)
        console.log('scorerId', scorerId, 'studentId', studentId)
        if (!council || !council.topics) {
            throw new Error('Không tìm thấy hội đồng hoặc danh sách đề tài')
        }

        const topic = council.topics.find((t) => t.topicId.toString() === topicId)

        if (!topic) {
            console.log('Không tìm thấy đề tài trong hội đồng')
            return null
        }
        console.log('topic found')
        // Tìm score của user hiện tại
        const myScore = topic.scores?.map(
            (s) =>{if(

                s.scorerId.toString() === scorerId && (studentId ? s.studentId?.toString() === studentId : !studentId)

            ) return s}
        )
        console.log('myScore', myScore)
        return myScore.length > 0 ? myScore.map(mc => ({
            studentId: mc?.studentId,
            scoreState: toScoreState(mc?.detailedScores)
        })) : null
    }
}
