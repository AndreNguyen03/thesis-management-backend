import { Injectable } from '@nestjs/common'
import { DefenseCouncilRepository } from '../repository/defense-council.repository'
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
import { DefenseCouncil } from '../schemas/defense-council.schema'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { TranferStatusAndAddPhaseHistoryProvider } from '../../topics/providers/tranfer-status-and-add-phase-history.provider'
import { TopicStatus } from '../../topics/enum'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'

@Injectable()
export class DefenseCouncilService {
    constructor(
        private readonly defenseCouncilRepository: DefenseCouncilRepository,
        private readonly tranferStatusAndAddHistory: TranferStatusAndAddPhaseHistoryProvider
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
    // lấy danh sách các hojoio đồng mà người này được phân công chấm
    // hiển thị cả đề tài không được phân công nhưng không active
    async getDetailAssignedDefenseCouncils(councilId: string, lecturerId: string) {
        return await this.defenseCouncilRepository.getDetailAssignedDefenseCouncils(councilId, lecturerId)
    }
}
