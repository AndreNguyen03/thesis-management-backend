import {
    Controller,
    Get,
    Body,
    Post,
    Patch,
    Param,
    Delete,
    Query,
    Req,
    UseGuards,
    UseInterceptors,
    UploadedFiles,
    BadRequestException,
    Res
} from '@nestjs/common'

import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { TopicService } from './application/topic.service'
import {
    BatchPublishTopic,
    BatchUpdateDefenseResultDto,
    CreateTopicDto,
    GetCancelRegisteredTopicResponseDto,
    GetPaginatedTopicsDto,
    GetTopicDetailResponseDto,
    PaginatedSubmittedTopics,
    PatchTopicDto,
    RequestGetTopicsApprovalRegistrationPagination
} from './dtos'
import { plainToInstance } from 'class-transformer'
import { Roles } from '../../auth/decorator/roles.decorator'
import { RolesGuard } from '../../auth/guards/roles/roles.guard'
import { UserRole } from '../../auth/enum/user-role.enum'
import { RequestGradeTopicDto } from './dtos/request-grade-topic.dtos'
import { FilesInterceptor } from '@nestjs/platform-express'
import { PaginationQueryDto } from '../../common/pagination-an/dtos/pagination-query.dto'
import { RejectTopicDto } from './dtos/action-with-topic.dtos'
import { WithDrawSubmittedTopicQuery } from './dtos/tranfer-topic-status.dtos'
import { GetMajorLibraryCombox } from '../majors/dtos/get-major.dto'
import { GetDocumentsDto } from '../upload-files/dtos/upload-file.dtos'
import { Response } from 'express'
import { SubmittedTopicParamsDto } from './dtos/query-params.dtos'
import { PaginatedTopicInBatchMilestone } from '../milestones/dtos/response-milestone.dto'

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
    @Patch('/mark-paused-topic')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD, UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async markPausedTopic(@Req() req: { user: ActiveUserData }, @Body() body: { topicIds: string[] }) {
        await this.topicService.markPausedTopic(body.topicIds, req.user.sub)
        return { message: 'Đề tài đã được đánh dấu là tạm dừng' }
    }

    @Get('/saved-topics')
    @Auth(AuthType.Bearer)
    async getSavedTopics(@Req() req: { user: ActiveUserData }, @Query() query: PaginationQueryDto) {
        const savedTopics = await this.topicService.getSavedTopics(req.user.sub, query)
        console.log('savedTopics', savedTopics)
        return plainToInstance(GetPaginatedTopicsDto, savedTopics, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    @Get('/registered-topics')
    @Auth(AuthType.Bearer)
    async getRegisteredTopics(@Req() req: { user: ActiveUserData }, @Query() query: PaginationQueryDto) {
        const topics = await this.topicService.getRegisteredTopics(req.user.sub, query)
        return plainToInstance(GetPaginatedTopicsDto, topics, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Get('/registration-approvals')
    @Auth(AuthType.Bearer)
    async getRegistrationApprovals(
        @Req() req: { user: ActiveUserData },
        @Query() query: RequestGetTopicsApprovalRegistrationPagination
    ) {
        console.log('query param get registration approvals :::', query)
        const topics = await this.topicService.getTopicRegistartionApprovals(req.user.sub, query)
        return topics
        return plainToInstance(GetPaginatedTopicsDto, topics, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Get('/canceled-registered-topics')
    @Auth(AuthType.Bearer)
    async getCanceledRegisteredTopics(@Req() req: { user: ActiveUserData }) {
        const topics = await this.topicService.getCanceledRegisteredTopics(req.user.sub, req.user.role)
        return plainToInstance(GetCancelRegisteredTopicResponseDto, topics, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Post()
    @Auth(AuthType.Bearer)
    @UseInterceptors(FilesInterceptor('files'))
    async createTopic(
        @Req() req: { user: ActiveUserData },
        @UploadedFiles() files: Express.Multer.File[],
        @Body() topic: CreateTopicDto
    ) {
        topic.createBy = req.user.sub
        const topicId = await this.topicService.createTopic(req.user.sub, topic, files)
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

    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    @Get('/lecturer/get-draft-topics')
    async getDraftTopics(@Req() req: { user: ActiveUserData }, @Query() query: PaginationQueryDto) {
        const res = await this.topicService.getDraftTopics(req.user.sub, query)
        return plainToInstance(GetPaginatedTopicsDto, res, {
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

    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    @Get('/lecturer/get-submitted-topics')
    async getSubmittedTopics(@Req() req: { user: ActiveUserData }, @Query() query: SubmittedTopicParamsDto) {
        const res = await this.topicService.getSubmittedTopics(req.user.sub, query)
        return plainToInstance(PaginatedSubmittedTopics, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

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

    @Patch(':topicId/in-period/:periodId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async updateTopic(@Param('topicId') id: string, @Param('periodId') periodId: string, @Body() topic: PatchTopicDto) {
        const result = await this.topicService.updateTopic(id, topic, periodId)
        return { topicId: result?._id, message: 'Cập nhật đề tài thành công' }
    }

    @Delete('/delete/')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async deleteTopics(@Req() req: { user: ActiveUserData }, @Body() topicId: string[]) {
        const res = await this.topicService.deleteTopics(topicId, req.user.sub)
        return res ? { message: 'Xóa đề tài thành công' } : { message: 'Xóa đề tài thất bại' }
    }

    @Post('/save-topic/:topicId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER, UserRole.STUDENT, UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async saveTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        return await this.topicService.assignSaveTopic(req.user.sub, topicId)
    }

    @Delete('/unsave-topic/:topicId')
    @Auth(AuthType.Bearer)
    async unSaveTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        return await this.topicService.unassignSaveTopic(req.user.sub, topicId)
    }
    @Patch('/lec/submit-topic/:topicId/in-period/:periodId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async submitTopic(
        @Req() req: { user: ActiveUserData },
        @Param('topicId') topicId: string,
        @Param('periodId') periodId: string
    ) {
        await this.topicService.submitTopic(topicId, req.user.sub, periodId)
        return { message: 'Nộp đề tài thành công' }
    }

    @Patch('/faculty-board/approve-topic/:topicId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async facultyBoardApproveTopic(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        await this.topicService.approveTopic(topicId, req.user.sub)
        return { message: 'Duyệt đề tài thành công' }
    }

    @Patch('/faculty-board/approve-topics')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async facultyBoardApproveTopics(@Req() req: { user: ActiveUserData }, @Body() body: { topicIds: string[] }) {
        await this.topicService.approveTopics(body.topicIds, req.user.sub)
        return { message: 'Duyệt các đề tài thành công' }
    }

    @Patch('faculty-board/reject-topic/:topicId')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async facultyBoardRejectTopic(
        @Req() req: { user: ActiveUserData },
        @Param('topicId') topicId: string,
        @Body() body: RejectTopicDto
    ) {
        await this.topicService.rejectTopic(topicId, req.user.sub, body.note)
        return { message: 'Đề tài đã được đánh dấu là không hợp lệ và gửi thông báo về cho giảng viên' }
    }
    @Patch('faculty-board/reject-topics')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async facultyBoardRejectTopics(
        @Req() req: { user: ActiveUserData },

        @Body() body: RejectTopicDto
    ) {
        await this.topicService.rejectTopics(body.topicIds, req.user.sub, body.note)
        return { message: 'Đề tài đã được đánh dấu là không hợp lệ và gửi thông báo về cho giảng viên' }
    }

    @Patch('/:topicId/set-in-progressing')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
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
    @Roles(UserRole.FACULTY_BOARD)
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

    //Tải file hướng dẫn lên topic
    //Chỉ có giảng viên thuộc đề tài mới được phép tải
    @Post('/:topicId/lecturer/upload-files')
    @Auth(AuthType.Bearer)
    @UseInterceptors(FilesInterceptor('files'))
    async lecturerUploadFile(
        @UploadedFiles() files: Express.Multer.File[],
        @Param('topicId') topicId: string,
        @Req() req: { user: ActiveUserData }
    ) {
        if (!files || files.length === 0) {
            throw new BadRequestException('Vui lòng chọn file để tải lên')
        }
        const res = await this.topicService.uploadManyFiles(req.user.sub, topicId, files)
        return plainToInstance(GetDocumentsDto, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    //Xóa nhiều file khỏi topic
    //Xóa hết file (thuộc topic): không cần truyền fileids
    //Chỉ có giảng viên thuộc đề tài mới được phép xóa
    @Delete('/:topicId/lecturer/delete-files')
    @Auth(AuthType.Bearer)
    @UseGuards(RolesGuard)
    async lecturerDeleteFiles(@Param('topicId') topicId: string, @Body() fileIds?: string[]) {
        const resultFiles = await this.topicService.deleteManyFile(topicId, fileIds)
        return { message: `Đã xóa thành công ${resultFiles} file` }
    }

    //Xóa từng file khỏi topic
    //Chỉ có giảng viên thuộc đề tài mới được phép xóa
    @Delete('/:topicId/lecturer/delete-file')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async lecturerDeleteFile(@Param('topicId') topicId: string, @Query('fileId') fileId: string) {
        const resultFiles = await this.topicService.deleteFile(topicId, fileId)
        return { message: `Đã xóa thành công ${resultFiles} file` }
    }

    // Lấy tất cả các meta options cần thiết để tạo đề tài
    @Get('/meta-options/for-create')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async getMetaOptionsForCreate(@Req() req: { user: ActiveUserData }) {
        const res = await this.topicService.getMetaOptionsForCreate(req.user.sub)
        return res
    }
    // Thay đổi cờ allowManualApproval
    @Patch('/:topicId/set-allow-manual-approval')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async setAllowManualApproval(
        @Param('topicId') topicId: string,
        @Query('allowManualApproval') allowManualApproval: boolean
    ) {
        const res = await this.topicService.setAllowManualApproval(topicId, allowManualApproval)
        return { message: 'Đã chuyển đổi trạng thái allowManualApproval của đề tài' }
    }

    @Patch('/withdraw-submitted-topics')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER, UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async tranferStatus(@Req() req: { user: ActiveUserData }, @Body() body: WithDrawSubmittedTopicQuery) {
        await this.topicService.withdrawSubmittedTopics(body.topicIds, req.user.sub)
        return { message: 'Chuyển trạng thái đề tài thành công' }
    }

    @Post('/copy-to-draft/:topicId')
    async copyToDraft(@Req() req: { user: ActiveUserData }, @Param('topicId') topicId: string) {
        const newTopicId = await this.topicService.copyToDraft(topicId, req.user.sub)
        return { message: 'Sao chép đề tài thành công', newTopicId }
    }

    @Get('/library/majors-combobox')
    async getComnboboxMajorsInLibrary() {
        const res = await this.topicService.getMajorsOfTopicInLibrary()
        return plainToInstance(GetMajorLibraryCombox, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Get('/library/years-combobox')
    async getComboboxYearsInLibrary() {
        return await this.topicService.getYearsOfTopicInLibrary()
    }

    @Get('/:topicId/documents')
    async getDocumentsOfTopic(@Param('topicId') topicId: string) {
        const res = await this.topicService.getDocumentsOfTopic(topicId)
        return plainToInstance(GetDocumentsDto, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    @Get('/:topicId/download-zip')
    @Auth(AuthType.Bearer)
    async downloadZip(@Res() res: Response, @Param('topicId') topicId: string) {
        return this.topicService.downloadZip(topicId, res)
    }

    @Get('/awaiting-evaluation/in-period/:periodId')
    async getTopicsAwaitingEvaluationInPeriod(@Param('periodId') periodId: string, @Query() query: PaginationQueryDto) {
        const res = await this.topicService.getTopicsAwaitingEvaluationInPeriod(periodId, query)
        return plainToInstance(PaginatedTopicInBatchMilestone, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Get('/in-defense-template/:templateMilestoneId')
    @Roles(UserRole.FACULTY_BOARD, UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async getDetailTopicsInDefenseMilestones(
        @Param('templateMilestoneId') templateMilestoneId: string,
        @Query() query: PaginationQueryDto
    ) {
        return await this.topicService.getDetailTopicsInDefenseMilestones(templateMilestoneId, query)
    }

    //cập nhật kết quả
    @Patch('/batch-update-defense-results')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async batchUpdateDefenseResults(@Body() body: BatchUpdateDefenseResultDto, @Req() req: { user: ActiveUserData }) {
        return await this.topicService.batchUpdateDefenseResults(body.results, req.user.sub)
    }
    //Công bố kết quả
    @Patch('/batch-publish-defense-results')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async batchPublishDefenseResults(
        @Body() body: BatchPublishTopic,
        @Req() req: { user: ActiveUserData },
        @Query('templateMilestoneId') templateMilestoneId: string
    ) {
        return await this.topicService.batchPublishOrNotDefenseResults(body.topics, req.user.sub, templateMilestoneId)
    }

    //Lưu đề tài vào thư viện số
    @Patch('/batch-archive')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async batchArchiveTopics(@Req() req: { user: ActiveUserData }, @Body() body: { topicIds: string[] }) {
        const { topicIds } = body
        let success = 0
        let failed = 0

        for (const topicId of topicIds) {
            try {
                await this.topicService.archiveTopic(topicId, req.user.sub)
                success++
            } catch (error) {
                failed++
                console.error(`Failed to archive topic ${topicId}: ${error.message}`)
            }
        }

        return {
            success,
            failed,
            message: `Đã lưu ${success} đề tài vào thư viện, ${failed} đề tài thất bại`
        }
    }
}
