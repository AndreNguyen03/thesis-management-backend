import { Controller, Get, Body, Post, Patch, Param, Delete, Query, Req, HttpStatus, UseGuards } from '@nestjs/common'

import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { TopicService } from './application/topic.service'
import {
    CreateTopicDto,
    GetCancelRegisteredTopicResponseDto,
    GetPaginatedTopicsDto,
    GetTopicDetailResponseDto,
    GetTopicResponseDto,
    PatchTopicDto
} from './dtos'
import { BaseHttpException } from '../../common/exceptions'
import { plainToInstance } from 'class-transformer'
import { TopicStatus } from './enum'
import { Roles } from '../../auth/decorator/roles.decorator'
import { RolesGuard } from '../../auth/guards/roles/roles.guard'
import { UserRole } from '../../auth/enum/user-role.enum'
import { RequestGradeTopicDto } from './dtos/request-grade-topic.dtos'

@Controller('topics')
export class TopicController {
    // create endpoint to add thesis
    constructor(private readonly topicService: TopicService) {}
    @Get()
    @Auth(AuthType.Bearer)
    async getTopicList(@Req() req: { user: ActiveUserData }) {
        const topics = await this.topicService.getAllTopics(req.user.sub)
        return plainToInstance(GetPaginatedTopicsDto, topics, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    @Get('/saved-topics')
    @Auth(AuthType.Bearer)
    async getSavedTopics(@Req() req: { user: ActiveUserData }) {
        const savedTopics = await this.topicService.getSavedTopics(req.user.sub)
        return plainToInstance(GetPaginatedTopicsDto, savedTopics, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    @Get('/registered-topics')
    @Auth(AuthType.Bearer)
    async getRegisteredTopics(@Req() req: { user: ActiveUserData }) {
        const topics = await this.topicService.getRegisteredTopics(req.user.sub)
        return plainToInstance(GetTopicResponseDto, topics, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Get('/canceled-registered-topics')
    @Auth(AuthType.Bearer)
    async getCanceledRegisteredTopics(@Req() req: { user: ActiveUserData }) {
        const topics = await this.topicService.getCanceledRegisteredTopics(req.user.sub, req.user.role)
        return topics
        return plainToInstance(GetCancelRegisteredTopicResponseDto, topics, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Get('/:topicId')
    @Auth(AuthType.Bearer)
    async getTopicById(@Param('topicId') topicId: string, @Req() req: { user: ActiveUserData }) {
        const topic = await this.topicService.getTopicById(topicId, req.user.sub, req.user.role)
        return plainToInstance(GetTopicDetailResponseDto, topic, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    @Post()
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async createTopic(@Req() req: { user: ActiveUserData }, @Body() topic: CreateTopicDto) {
        topic.createBy = req.user.sub
        const topicId = await this.topicService.createTopic(req.user.sub, topic)
        return { topicId, message: 'Tạo đề tài thành công' }
    }
    @Patch()
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    @Patch(':topicId/ref-fields-topic/:fieldId')
    async addFieldToTopicQuick(
        @Req() req: { user: ActiveUserData },
        @Param('topicId') topicId: string,
        @Param('fieldId') fieldId: string
    ) {
        await this.topicService.addFieldToTopicQuick(topicId, fieldId, req.user.sub)
        return { message: 'Thêm lĩnh vực cho đề tài thành công' }
    }

    @Patch()
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    @Delete(':topicId/ref-fields-topic/:fieldId')
    async removeFieldFromTopicQuick(
        @Req() req: { user: ActiveUserData },
        @Param('topicId') topicId: string,
        @Param('fieldId') fieldId: string
    ) {
        await this.topicService.removeFieldFromTopicQuick(topicId, fieldId, req.user.sub)
        return { message: 'Xóa lĩnh vực cho đề tài thành công' }
    }

    @Patch()
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    @Patch(':topicId/ref-requirements-topic/:requirementId')
    async addRequirementToTopicQuick(
        @Req() req: { user: ActiveUserData },
        @Param('topicId') topicId: string,
        @Param('requirementId') requirementId: string
    ) {
        await this.topicService.addRequirementToTopicQuick(topicId, requirementId, req.user.sub)
        return { message: 'Thêm yêu cầu cho đề tài thành công' }
    }

    @Patch()
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    @Delete(':topicId/ref-fields-topic/:fieldId')
    async removeRequirementFromTopicQuick(
        @Req() req: { user: ActiveUserData },
        @Param('topicId') topicId: string,
        @Param('requirementId') requirementId: string
    ) {
        await this.topicService.removeRequirementFromTopicQuick(topicId, requirementId, req.user.sub)
        return { message: 'Xóa yêu cầu cho đề tài thành công' }
    }

    @Patch(':topicId/:periodId')
    @Auth(AuthType.None)
    async updateTopic(@Param('topicId') id: string, @Param('periodId') periodId: string, @Body() topic: PatchTopicDto) {
        const result = await this.topicService.updateTopic(id, topic, periodId)
        return { topicId: result?._id, message: 'Cập nhật đề tài thành công' }
    }

    @Delete('/delete/:topicId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async deleteTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') id: string) {
        const res = await this.topicService.deleteTopic(id, req.user.sub)
        return res ? { message: 'Xóa đề tài thành công' } : { message: 'Xóa đề tài thất bại' }
    }

    @Post('/save-topic/:topicId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER, UserRole.STUDENT)
    @UseGuards(RolesGuard)
    async saveTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        return await this.topicService.assignSaveTopic(req.user.sub, topicId)
    }

    @Delete('/unsave-topic/:topicId')
    @Auth(AuthType.Bearer)
    async unSaveTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        return await this.topicService.unassignSaveTopic(req.user.sub, topicId)
    }
    @Patch('/:topicId/lecturer/submit-topic')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async submitTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        await this.topicService.submitTopic(topicId, req.user.sub)
        return { message: 'Nộp đề tài thành công' }
    }

    @Patch('/:topicId/facuty-board/approve-topic')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.DEPARTMENT_BOARD)
    @UseGuards(RolesGuard)
    async facultyBoardApproveTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        await this.topicService.approveTopic(topicId, req.user.sub)
        return { message: 'Nộp đề tài thành công' }
    }

    @Patch('/:topicId/facuty-board/reject-topic')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.DEPARTMENT_BOARD)
    @UseGuards(RolesGuard)
    async facultyBoardRejectTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        await this.topicService.rejectTopic(topicId, req.user.sub)
        return { message: 'Đề tài đã được đánh dấu là không hợp lệ và gửi thông báo về cho giảng viên' }
    }
    @Patch('/:topicId/under-review')
    @Roles(UserRole.DEPARTMENT_BOARD)
    @UseGuards(RolesGuard)
    async markUnderReviewingTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        await this.topicService.markUnderReviewing(topicId, req.user.sub)
        return { message: 'Đề tài đã được đánh dấu là đang được xem xét' }
    }

    @Patch('/:topicId/set-in-progressing')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.DEPARTMENT_BOARD)
    @UseGuards(RolesGuard)
    async setTopicInProgressing(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        await this.topicService.setTopicInProgressing(topicId, req.user.sub)
        return { message: 'Đề tài đã ở trạng thái đang tiếp tục thực hiện' }
    }

    @Patch('/:topicId/mark-deplayed-topic')
    @Auth(AuthType.Bearer)
    async markDelayedTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        await this.topicService.markDelayedTopic(topicId, req.user.sub)
        return { message: 'Đề tài bị đánh dấu là trễ hạn' }
    }

    @Patch('/:topicId/mark-paused-topic')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.DEPARTMENT_BOARD, UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async markPausedTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        await this.topicService.markPausedTopic(topicId, req.user.sub)
        return { message: 'Đề tài đã được đánh dấu là tạm dừng' }
    }

    @Patch('/:topicId/sumit-topic/completed-processing')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.STUDENT)
    @UseGuards(RolesGuard)
    async markCompletedProcessing(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        await this.topicService.markStudentCompletedProcessing(topicId, req.user.sub)
        return { message: 'Sinh viên đã xác nhận hoàn thành đề tài' }
    }
    //Giảng viên cho phép đề tài ra hội đồng chấm điểm
    @Patch('/:topicId/set-awaiting-evaluation')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async setAwaitingEvaluation(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        await this.topicService.setAwaitingEvaluation(topicId, req.user.sub)
        return { message: 'Đã đặt trạng thái chờ đánh giá' }
    }

    //Hội đồng chấm điểm đề tài
    @Patch('/:topicId/scoring-board/grade-topic')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async scoringBoardGradeTopic(
        @Req() req: { user: ActiveUserData },
        @Param('topicId') topicId: string,
        @Body() body: RequestGradeTopicDto
    ) {
        await this.topicService.scoringBoardScoreTopic(topicId, req.user.sub, body)
        return { message: 'Đã chấm điểm đề tài' }
    }

    //hội đồng chấm điểm từ chối đề tài
    @Patch('/:topicId/scoring-board/reject-topic')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async scoringBoardRejectTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        await this.topicService.scoringBoardRejectTopic(topicId, req.user.sub)
        return { message: 'Đã từ chối đề tài' }
    }

    //BCN khoa xem điểm đề tài
    @Patch('/:topicId/review-graded-topic')
    @Roles(UserRole.DEPARTMENT_BOARD)
    @UseGuards(RolesGuard)
    @Auth(AuthType.Bearer)
    async markReviewedTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        await this.topicService.facultyBoardReviewGradedTopic(topicId, req.user.sub)
        return { message: 'Đã đánh dấu là đã xem đề tài' }
    }

    //BCN khoa quyết định đưa đề tài vào thư viện số
    @Patch('/:topicId/archive-topic')
    async archiveTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        await this.topicService.archiveTopic(topicId, req.user.sub)
        return { message: 'Đã lưu trữ đề tài' }
    }
}
