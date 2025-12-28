import {
    Body,
    Controller,
    Get,
    Inject,
    Param,
    Patch,
    Post,
    Put,
    Query,
    Req,
    Res,
    UploadedFiles,
    UseGuards,
    UseInterceptors
} from '@nestjs/common'
import { MilestonesService } from './application/milestones.service'
import {
    PaginationRequestTopicInMilestoneQuery,
    PayloadCreateMilestone,
    PayloadFacultyCreateMilestone,
    RequestLecturerReview,
    ManageTopicsInDefenseMilestoneDto
} from './dtos/request-milestone.dto'
import { RolesGuard } from '../../auth/guards/roles/roles.guard'
import { UserRole } from '../../auth/enum/user-role.enum'
import { Roles } from '../../auth/decorator/roles.decorator'
import { FilesInterceptor } from '@nestjs/platform-express'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { plainToInstance } from 'class-transformer'
import { PaginatedTopicInBatchMilestone, ResponseMilestone } from './dtos/response-milestone.dto'
import { FileInfo } from './schemas/milestones.schemas'
import { RequestCreate } from '../todolists/dtos/request-update.dtos'
import { Response } from 'express'

@Controller('milestones')
export class MilestonesController {
    constructor(@Inject() private readonly milestonesService: MilestonesService) {}

    @Patch('/:milestoneId/lecturer-review')
    async reviewMilestone(
        @Param('milestoneId') milestoneId: string,
        @Req() req: { user: ActiveUserData },
        @Body() body: RequestLecturerReview
    ) {
        const isAbleGotoDefense = await this.milestonesService.reviewMilestone(milestoneId, req.user.sub, body)
        return {
            message: 'Tạo nhận xét thành công',
            isAbleToGotoDefense: isAbleGotoDefense
        }
    }

    @Get('/in-group/:groupId/')
    async getMilestonesOfGroup(@Param('groupId') groupId: string) {
        const res = await this.milestonesService.getMilestonesOfGroup(groupId)
        return plainToInstance(ResponseMilestone, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Post('/create-task')
    async createTaskInMineTones(@Body() body: RequestCreate) {
        return await this.milestonesService.createTaskInMinesTone(body)
    }
    @Post('/faculty-create')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async facultyCreate(@Req() req: { user: ActiveUserData }, @Body() body: PayloadFacultyCreateMilestone) {
        return plainToInstance(ResponseMilestone, await this.milestonesService.facultyCreate(body, req.user), {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Post('')
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async createMilestone(@Req() req: { user: ActiveUserData }, @Body() body: PayloadCreateMilestone) {
        return plainToInstance(ResponseMilestone, await this.milestonesService.createMilestone(body, req.user), {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Post('/:milestoneId/submit')
    @UseInterceptors(FilesInterceptor('files'))
    async submitReport(
        @UploadedFiles() files: Express.Multer.File[],
        @Param('milestoneId') milestoneId: string,
        @Req() req: { user: ActiveUserData }
    ): Promise<FileInfo[]> {
        return await this.milestonesService.submitReport(files, milestoneId, req.user.sub)
    }

    @Get('/in-period/:periodId/faculty-board')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async getMilestonesCreatedByFacultyBoard(@Param('periodId') periodId: string) {
        return await this.milestonesService.facultyGetMilestonesInPeriod(periodId)
    }

    @Put('/set-active/:milestoneId')
    @Roles(UserRole.LECTURER, UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async setMilestoneActive(@Param('milestoneId') milestoneId: string, @Query() isActive: boolean) {
        return await this.milestonesService.updateActiveState(milestoneId, isActive)
    }
    @Get('/:batchId/faculty-download-zip')
    async downloadZipByBatchId(@Res() res: Response, @Param('batchId') batchId: string) {
        return this.milestonesService.facultyDownloadZipWithBatch(batchId, res)
    }

    @Get('/:milestoneId/milestone-download-zip')
    async downloadZipByMilestoneId(@Res() res: Response, @Param('milestoneId') milestoneId: string) {
        return this.milestonesService.facultyDownloadZipWithMilestoneId(milestoneId, res)
    }

    @Get('/topics-in-parent-milestone/:parentId')
    async facultyGetTopicInBatch(
        @Param('parentId') parentId: string,
        @Query() query: PaginationRequestTopicInMilestoneQuery
    ) {
        const res = await this.milestonesService.facultyGetTopicInBatchMilestone(parentId, query)
        return plainToInstance(PaginatedTopicInBatchMilestone, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Get('/in-period/manage-defense-assignment/:periodId')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async facultyGetMilestonesInManageDefenseAssignment(@Param('periodId') periodId: string) {
        return await this.milestonesService.facultyGetMilestonesInManageDefenseAssignment(periodId)
    }

    @Patch('/defense-milestone/manage-topics')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async manageTopicsInDefenseMilestone(@Req() req: { user: ActiveUserData }, @Body() body: any) {
        console.log('Received manage topics request:', body)
        await this.milestonesService.manageTopicsInDefenseMilestone(body, req.user.sub)
        return {
            message:
                body.action === 'add'
                    ? 'Thêm đề tài vào hội đồng bảo vệ thành công'
                    : 'Xóa đề tài khỏi hội đồng bảo vệ thành công'
        }
    }

    @Patch('/defense-milestone/manage-lecturers')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async manageLecturersInDefenseMilestone(@Req() req: { user: ActiveUserData }, @Body() body: any) {
        console.log('Received manage topics request:', body)
        await this.milestonesService.manageTopicsInDefenseMilestone(body, req.user.sub)
        return {
            message:
                body.action === 'add'
                    ? 'Thêm đề tài vào hội đồng bảo vệ thành công'
                    : 'Xóa đề tài khỏi hội đồng bảo vệ thành công'
        }
    }
}
