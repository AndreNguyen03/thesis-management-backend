import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { DefenseCouncilService } from './application/defense-council.service'
import { Roles } from '../../auth/decorator/roles.decorator'
import { UserRole } from '../../auth/enum/user-role.enum'
import { RolesGuard } from '../../auth/guards/roles/roles.guard'
import {
    AddTopicToCouncilDto,
    AddMultipleTopicsToCouncilDto,
    CreateDefenseCouncilDto,
    GetDefenseCouncilsQuery,
    QueryDefenseCouncilsDto,
    SubmitScoreDto,
    UpdateDefenseCouncilDto,
    UpdateTopicMembersDto,
    UpdateTopicOrderDto,
    SubmitTopicScoresDto
} from './dtos/defense-council.dto'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { PaginationQueryDto } from '../../common/pagination-an/dtos/pagination-query.dto'
import { CouncilRoleGuard, CouncilRoles } from './guards/council-role.guard'

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

    // Thêm nhiều đề tài vào hội đồng cùng lúc
    @Post(':councilId/topics/batch')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async addMultipleTopicsToCouncil(
        @Param('councilId') councilId: string,
        @Body() dto: AddMultipleTopicsToCouncilDto,
        @Req() req: { user: ActiveUserData }
    ) {
        const council = await this.defenseCouncilService.addMultipleTopicsToCouncil(req.user.sub, councilId, dto)
        return {
            message: `Thêm ${dto.topics.length} đề tài vào hội đồng thành công`,
            data: council
        }
    }

    // Xóa đề tài khỏi hội đồng
    @Delete(':councilId/topics/:topicId')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async removeTopicFromCouncil(
        @Req() req: { user: ActiveUserData },
        @Param('councilId') councilId: string,
        @Param('topicId') topicId: string
    ) {
        const council = await this.defenseCouncilService.removeTopicFromCouncil(req.user.sub, councilId, topicId)
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
    //lấy chi tiết chấm điểm hội đồng
    //giảng viên chi xem được hội đồng mà minhf được phân công
    //BCN xem được tất cả
    @Get('/detail-scoring-council/:councilId')
    @Roles(UserRole.FACULTY_BOARD, UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async getDetailScoringDefenseCouncil(@Req() req: { user: ActiveUserData }, @Param('councilId') councilId: string) {
        const _id = req.user.role === UserRole.LECTURER ? req.user.sub : undefined
        return await this.defenseCouncilService.getDetailScoringDefenseCouncil(councilId, _id)
    }

    // === NEW ENDPOINTS FOR SECRETARY SCORING WORKFLOW ===

    // Thư ký nhập điểm cho đề tài (tất cả thành viên cùng lúc)
    @Post(':councilId/topics/:topicId/submit-scores')
    @Roles(UserRole.FACULTY_BOARD, UserRole.LECTURER)
    @UseGuards(RolesGuard, CouncilRoleGuard)
    @CouncilRoles('secretary') // Chỉ thư ký mới được nhập điểm
    async submitTopicScores(
        @Param('councilId') councilId: string,
        @Param('topicId') topicId: string,
        @Body() dto: SubmitTopicScoresDto,
        @Req() req: { user: ActiveUserData }
    ) {
        const council = await this.defenseCouncilService.submitTopicScores(councilId, topicId, dto, req.user.sub)
        return {
            message: 'Nhập điểm thành công',
            data: council
        }
    }

    // Khóa điểm một đề tài
    @Post(':councilId/topics/:topicId/lock')
    @Roles(UserRole.FACULTY_BOARD, UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async lockTopicScores(@Param('councilId') councilId: string, @Param('topicId') topicId: string) {
        const council = await this.defenseCouncilService.lockTopicScores(councilId, topicId)
        return {
            message: 'Khóa điểm đề tài thành công',
            data: council
        }
    }

    // Mở khóa điểm một đề tài (BCN)
    @Post(':councilId/topics/:topicId/unlock')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async unlockTopicScores(@Param('councilId') councilId: string, @Param('topicId') topicId: string) {
        const council = await this.defenseCouncilService.unlockTopicScores(councilId, topicId)
        return {
            message: 'Mở khóa điểm đề tài thành công',
            data: council
        }
    }

    // Khóa hội đồng với validation (Thư ký/BCN)
    @Post(':councilId/complete-with-validation')
    @Roles(UserRole.FACULTY_BOARD, UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async completeCouncilWithValidation(@Param('councilId') councilId: string, @Req() req: { user: ActiveUserData }) {
        const council = await this.defenseCouncilService.completeCouncilWithValidation(councilId, req.user.sub)
        return {
            message: 'Khóa hội đồng thành công',
            data: council
        }
    }

    // Công bố điểm (BCN)
    @Post(':councilId/publish-scores')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async publishCouncilScores(@Param('councilId') councilId: string, @Req() req: { user: ActiveUserData }) {
        const council = await this.defenseCouncilService.publishCouncilScores(councilId, req.user.sub)
        return {
            message: 'Công bố điểm thành công',
            data: council
        }
    }

    // Get student's own defense scores
    @Get('student/my-scores')
    @Roles(UserRole.STUDENT)
    @UseGuards(RolesGuard)
    async getMyDefenseScores(@Req() req: { user: ActiveUserData }) {
        const scores = await this.defenseCouncilService.getStudentDefenseScores(req.user.sub)
        return {
            message: 'Lấy điểm bảo vệ thành công',
            data: scores
        }
    }

    @Get(':councilId/export-scores-template')
    @Roles(UserRole.FACULTY_BOARD, UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async exportScoresTemplate(@Param('councilId') councilId: string, @Query('includeScores') includeScores?: string) {
        const buffer = await this.defenseCouncilService.exportScoresTemplate(councilId, includeScores === 'true')

        return {
            message: 'Export thành công',
            data: {
                buffer: buffer.toString('base64'),
                filename: `HoiDong_${councilId}_BangDiem.xlsx`
            }
        }
    }

    @Post(':councilId/import-scores')
    @Roles(UserRole.FACULTY_BOARD, UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async importScores(
        @Param('councilId') councilId: string,
        @Body() importData: { data: any[] },
        @Req() req: { user: ActiveUserData }
    ) {
        const result = await this.defenseCouncilService.importScoresFromExcel(councilId, importData.data, req.user.sub)
        return {
            message: `Import thành công ${result.successCount}/${result.totalCount} đề tài`,
            data: result
        }
    }

    // Phase 4: PDF Export
    @Get(':councilId/export-pdf-report')
    @Roles(UserRole.FACULTY_BOARD, UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async exportPdfReport(@Param('councilId') councilId: string, @Res() res: Response) {
        const pdf = await this.defenseCouncilService.generateCouncilPdfReport(councilId)

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="HoiDong_${councilId}_BaoCao.pdf"`,
            'Content-Length': pdf.length
        })
        res.end(pdf)
    }

    @Get(':councilId/topics/:topicId/score-card-pdf')
    @Roles(UserRole.FACULTY_BOARD, UserRole.LECTURER, UserRole.STUDENT)
    @UseGuards(RolesGuard)
    async exportTopicScoreCard(
        @Param('councilId') councilId: string,
        @Param('topicId') topicId: string,
        @Res() res: Response
    ) {
        const pdf = await this.defenseCouncilService.generateTopicScoreCard(councilId, topicId)

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="PhieuDiem_${topicId}.pdf"`,
            'Content-Length': pdf.length
        })
        res.end(pdf)
    }

    // Phase 4: Analytics
    @Get(':councilId/analytics')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async getCouncilAnalytics(@Param('councilId') councilId: string) {
        const analytics = await this.defenseCouncilService.getCouncilAnalytics(councilId)
        return {
            message: 'Lấy thống kê thành công',
            data: analytics
        }
    }
}
