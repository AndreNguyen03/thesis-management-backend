import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { DefenseCouncilService } from './application/defense-council.service'
import { Roles } from '../../auth/decorator/roles.decorator'
import { UserRole } from '../../auth/enum/user-role.enum'
import { RolesGuard } from '../../auth/guards/roles/roles.guard'
import {
    AddTopicToCouncilDto,
    CreateDefenseCouncilDto,
    GetDefenseCouncilsQuery,
    QueryDefenseCouncilsDto,
    SubmitScoreDto,
    UpdateDefenseCouncilDto,
    UpdateTopicMembersDto,
    UpdateTopicOrderDto
} from './dtos/defense-council.dto'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'

@Controller('defense-councils')
@Auth(AuthType.Bearer)
export class DefenseCouncilController {
    constructor(private readonly defenseCouncilService: DefenseCouncilService) {}

    // Tạo hội đồng mới
    @Post()
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async createCouncil(@Body() dto: CreateDefenseCouncilDto, @Req() req: { user: ActiveUserData }) {
        const council = await this.defenseCouncilService.createCouncil(dto, req.user.sub)
        return {
            message: 'Tạo hội đồng bảo vệ thành công',
            data: council
        }
    }

    // Lấy danh sách hội đồng
    @Get()
    @Roles(UserRole.FACULTY_BOARD, UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async getCouncils(@Query() query: GetDefenseCouncilsQuery, @Req() req: { user: ActiveUserData }) {
        // Nếu là giảng viên, chỉ lấy hội đồng của mình
        if (req.user.role === UserRole.LECTURER) {
            return await this.defenseCouncilService.getCouncilsByLecturer(req.user.sub, query)
        }
        // Faculty board lấy tất cả
        const result = await this.defenseCouncilService.getCouncils(query)
        return result
    }

    // Lấy chi tiết hội đồng
    @Get(':councilId')
    @Roles(UserRole.FACULTY_BOARD, UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async getCouncilById(@Param('councilId') councilId: string) {
        const council = await this.defenseCouncilService.getCouncilById(councilId)
        return council
    }

    // Cập nhật thông tin hội đồng
    @Patch(':councilId')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async updateCouncil(@Param('councilId') councilId: string, @Body() dto: UpdateDefenseCouncilDto) {
        const council = await this.defenseCouncilService.updateCouncil(councilId, dto)
        return {
            message: 'Cập nhật hội đồng thành công',
            data: council
        }
    }

    // Xóa hội đồng
    @Delete(':councilId')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async deleteCouncil(@Param('councilId') councilId: string) {
        await this.defenseCouncilService.deleteCouncil(councilId)
        return {
            message: 'Xóa hội đồng thành công'
        }
    }

    // Thêm đề tài vào hội đồng
    @Post(':councilId/topics')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async addTopicToCouncil(@Param('councilId') councilId: string, @Body() dto: AddTopicToCouncilDto) {
        const council = await this.defenseCouncilService.addTopicToCouncil(councilId, dto)
        return {
            message: 'Thêm đề tài vào hội đồng thành công',
            data: council
        }
    }

    // Xóa đề tài khỏi hội đồng
    @Delete(':councilId/topics/:topicId')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async removeTopicFromCouncil(@Param('councilId') councilId: string, @Param('topicId') topicId: string) {
        const council = await this.defenseCouncilService.removeTopicFromCouncil(councilId, topicId)
        return {
            message: 'Xóa đề tài khỏi hội đồng thành công',
            data: council
        }
    }

    // Cập nhật bộ ba giảng viên cho đề tài
    @Patch(':councilId/topics/:topicId/members')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async updateTopicMembers(
        @Param('councilId') councilId: string,
        @Param('topicId') topicId: string,
        @Body() dto: UpdateTopicMembersDto
    ) {
        const council = await this.defenseCouncilService.updateTopicMembers(councilId, topicId, dto)
        return {
            message: 'Cập nhật bộ ba giảng viên thành công',
            data: council
        }
    }

    // Cập nhật thứ tự bảo vệ
    @Patch(':councilId/topics/:topicId/order')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async updateTopicOrder(
        @Param('councilId') councilId: string,
        @Param('topicId') topicId: string,
        @Body() dto: UpdateTopicOrderDto
    ) {
        const council = await this.defenseCouncilService.updateTopicOrder(councilId, topicId, dto.defenseOrder)
        return {
            message: 'Cập nhật thứ tự bảo vệ thành công',
            data: council
        }
    }

    // Chấm điểm
    @Post(':councilId/scores')
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async submitScore(
        @Param('councilId') councilId: string,
        @Body() dto: SubmitScoreDto,
        @Req() req: { user: ActiveUserData }
    ) {
        const council = await this.defenseCouncilService.submitScore(councilId, dto, req.user.sub, 'Unknown')
        return {
            message: 'Chấm điểm thành công',
            data: council
        }
    }

    // Lấy điểm của đề tài
    @Get(':councilId/topics/:topicId/scores')
    @Roles(UserRole.FACULTY_BOARD, UserRole.LECTURER, UserRole.STUDENT)
    @UseGuards(RolesGuard)
    async getTopicScores(@Param('councilId') councilId: string, @Param('topicId') topicId: string) {
        const scores = await this.defenseCouncilService.getTopicScores(councilId, topicId)
        return scores
    }

    // Công bố điểm
    @Post(':councilId/publish')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async publishScores(@Param('councilId') councilId: string) {
        const council = await this.defenseCouncilService.publishScores(councilId)
        return {
            message: 'Công bố điểm thành công',
            data: council
        }
    }

    // Hoàn thành hội đồng
    @Post(':councilId/complete')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async completeCouncil(@Param('councilId') councilId: string) {
        const council = await this.defenseCouncilService.completeCouncil(councilId)
        return {
            message: 'Hoàn thành hội đồng thành công',
            data: council
        }
    }
}
