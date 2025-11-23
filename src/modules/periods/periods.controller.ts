import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { PeriodsService } from './application/periods.service'
import { CreatePeriodDto, GetPaginatedPeriodDto, GetPeriodDetailDto, UpdatePeriodDto } from './dtos/period.dtos'
import { RequestGetPeriodsDto } from './dtos/request-get-all.dto'
import { plainToInstance } from 'class-transformer'
import {
    CreateCompletionPhaseDto,
    CreateExecutionPhaseDto,
    CreateOpenRegPhaseDto,
    CreatePhaseSubmitTopicDto,
    GetPeriodPhaseDto,
    UpdatePeriodPhaseDto
} from './dtos/period-phases.dtos'
import { RequestGetTopicsInPeriodDto, RequestGetTopicsInPhaseDto } from '../topics/dtos'
import { UserRole } from '../../auth/enum/user-role.enum'
import { Roles } from '../../auth/decorator/roles.decorator'
import { RolesGuard } from '../../auth/guards/roles/roles.guard'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { Period } from './schemas/period.schemas'

@Controller('periods')
export class PeriodsController {
    constructor(private readonly periodsService: PeriodsService) {}

    // Tạo kì/ đợt đăng ký mới
    @Post()
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async createNewPeriod(@Req() req: { user: ActiveUserData }, @Body() createPeriodDto: CreatePeriodDto) {
        await this.periodsService.createNewPeriod(req.user.sub, req.user.facultyId!, createPeriodDto)
        return { message: 'Kỳ mới đã được tạo thành công' }
    }

    // Lấy tất cả các kỳ
    @Get('/get-all')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async getAllPeriods(
        @Req() req: { user: ActiveUserData },
        @Query() query: RequestGetPeriodsDto
    ): Promise<GetPaginatedPeriodDto> {
        const res = await this.periodsService.getAllPeriods(req.user.facultyId!, query)
        return plainToInstance(GetPaginatedPeriodDto, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Delete('delete-period/:id')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async deletePeriod(@Param('id') id: string) {
        await this.periodsService.deletePeriod(id)
        return { message: 'Xóa kỳ thành công' }
    }
    // Thay đổi thoong tin kỳ
    @Patch('adjust-period/:periodId')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async adjustPeriod(@Param('periodId') periodId: string, @Body() adjustPeriodDto: UpdatePeriodDto) {
        await this.periodsService.adjustPeriod(periodId, adjustPeriodDto)
        return { message: 'Điều chỉnh kỳ thành công' }
    }

    // Set kỳ đã kết thúc
    @Patch('period-completed/:periodId')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async setPeriodEnded(@Param('periodId') periodId: string) {
        await this.periodsService.setPeriodCompleted(periodId)
        return { message: 'Đã đặt kỳ là kết thúc' }
    }

    //Lấy thông tin của kì
    @Get('/detail-period/:periodId')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async getPeriodInfo(@Param('periodId') periodId: string) {
        console.log(periodId)
        const res = await this.periodsService.getPeriodInfo(periodId)
        console.log('Raw period info:', res)

        const data = plainToInstance(GetPeriodDetailDto, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })

        console.log('Transformed DTO:', data)

        return data
    }

    @Patch('/:periodId/create-submit-topic-phase')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async createSubmitTopicPhase(
        @Req() req: { user: ActiveUserData },
        @Param('periodId') periodId: string,
        @Body() createPhaseSubmitTopicDto: CreatePhaseSubmitTopicDto,
        @Query('force') force: boolean
    ) {
        await this.periodsService.createPhaseSubmitTopic(req.user.sub, periodId, createPhaseSubmitTopicDto, force)
        return { message: 'Tạo giai đoạn "nộp đề tài" thành công' }
    }

    @Patch(':periodId/create-execution-phase')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async createExecutionPhase(
        @Req() req: { user: ActiveUserData },
        @Param('periodId') periodId: string,
        @Body() createExecutionPhaseDto: CreateExecutionPhaseDto,
        @Query('force') force: boolean
    ) {
        return await this.periodsService.createPhaseExecution(req.user.sub, periodId, createExecutionPhaseDto, force)
    }

    @Patch(':periodId/create-open-reg-phase')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async createOpenRegPhase(
        @Req() req: { user: ActiveUserData },
        @Param('periodId') periodId: string,
        @Body() createOpenRegPhaseDto: CreateOpenRegPhaseDto,
        @Query('force') force: boolean
    ) {
        return await this.periodsService.createPhaseOpenReg(req.user.sub, periodId, createOpenRegPhaseDto, force)
    }

    @Patch(':periodId/create-completion-phase')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async createCompletionPhase(
        @Req() req: { user: ActiveUserData },
        @Param('periodId') periodId: string,
        @Body() createCompletionPhaseDto: CreateCompletionPhaseDto
    ) {
        await this.periodsService.createPhaseCompletion(req.user.sub, periodId, createCompletionPhaseDto)
        return { message: 'Tạo giai đoạn "hoàn thành" thành công' }
    }

    @Patch(':periodId/update-phase/:phaseId')
    async updatePhase(
        @Param('periodId') periodId: string,
        @Param('phaseId') phaseId: string,
        @Body() updatePhaseDto: UpdatePeriodPhaseDto
    ) {
        await this.periodsService.updatePhase(periodId, phaseId, updatePhaseDto)
        return { message: 'Cập nhật giá trị của phase thành công' }
    }
    //Lấy những đề tài nằm trong kỳ cụ thể
    @Get('get-topics-in-period/:periodId')
    async getTopicsInPeriod(@Param('periodId') periodId: string, @Query() query: RequestGetTopicsInPeriodDto) {
        const topics = await this.periodsService.getTopicsInPeriod(periodId, query)
        return topics
    }

    //Lấy những đề tài nằm trong pha cụ thể
    @Get('get-topics-in-phase/:phaseId')
    async getTopicsInPhase(@Param('phaseId') phaseId: string, @Query() query: RequestGetTopicsInPhaseDto) {
        const topics = await this.periodsService.getTopicsInPhase(phaseId, query)
        return topics
    }

    // // Thay đổi trạng thái toàn bộ đề tài thuộc kì này, khi chuyển pha này sang pha khác
    // @Patch('/:periodId/status/tranfer-phase')
    // async changeStatusAllTopicsInPeriod(
    //     @Param('periodId') periodId: string,
    //     @Param('topicId') topicId: string,
    //     @Body() body: { newStatus: string; newPhaseId: string }
    // ) {
    //     // Logic để thay đổi trạng thái đề tài
    //     await this.periodsService.changeStatusAllTopicsInPeriod(periodId, body.newStatus, body.newPhaseId)
    //     return { message: 'Đã thay đổi trạng thái đề tài thành công' }
    // }

    //Lấy thống kế ở pha 1 - pha nộp đề tàii
    @Get('/:periodId/faculty-board/submit-topic-phase/statistics')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async getStatisticsSubmitTopicPhase(@Param('periodId') periodId: string) {
        const statistics = await this.periodsService.boardGetStatisticsSubmitTopicPhase(periodId)
        return statistics
    }
    //Lấy thống kế ở pha 2 - pha đăng ký đề tài
    @Get('/:periodId/faculty-board/open-registration-phase/statistics')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async getStatisticsOpenRegistrationPhase(@Param('periodId') periodId: string) {
        const statistics = await this.periodsService.boardGetStatisticsOpenRegistrationPhase(periodId)
        return statistics
    }
    //Lấy thống kế ở pha 3 - pha thực hiện đề tài
    @Get('/:periodId/faculty-board/execution-phase/statistics')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async getStatisticsExecutionPhase(@Param('periodId') periodId: string) {
        const statistics = await this.periodsService.boardGetStatisticsExecutionPhase(periodId)
        return statistics
    }
    //Lấy thống kế ở pha 4 - pha hoàn thành đề tài
    @Get('/:periodId/faculty-board/completion-phase/statistics')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async lecturerGetStatisticsCompletionPhase(@Param('periodId') periodId: string) {
        const statistics = await this.periodsService.boardGetStatisticsCompletionPhase(periodId)
        return statistics
    }

    //GV - Lấy thống kế ở pha 1 - pha nộp đề tài
    @Get('/:periodId/lecturer/submit-topic-phases/statistics')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async lecturerGetStatisticsSubmitTopicPhase(
        @Req() req: { user: ActiveUserData },
        @Param('periodId') periodId: string
    ) {
        const statistics = await this.periodsService.lecturerGetStatisticsSubmitTopicPhase(periodId, req.user.sub)
        return statistics
    }
    //GV - Lấy thống kế ở pha 2 - pha đăng ký đề tài
    @Get('/:periodId/lecturer/open-registration-phases/statistics')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async lecturerGetStatisticsOpenRegistrationPhase(
        @Req() req: { user: ActiveUserData },
        @Param('periodId') periodId: string
    ) {
        const statistics = await this.periodsService.lecturerGetStatisticsOpenRegistrationPhase(periodId, req.user.sub)
        return statistics
    }
    //GV - Lấy thống kế ở pha 3 - pha thực hiện đề tài
    @Get('/:periodId/lecturer/execution-phases/statistics')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async lecturerGetStatisticsExecutionPhase(
        @Req() req: { user: ActiveUserData },
        @Param('periodId') periodId: string
    ) {
        const statistics = await this.periodsService.lecturerGetStatisticsExecutionPhase(periodId, req.user.sub)
        return statistics
    }
    //GV -Lấy thống kế ở pha 4 - pha hoàn thành đề tài
    @Get('/:periodId/lecturer/completion-phases/statistics')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async getStatisticsCompletionPhase(@Req() req: { user: ActiveUserData }, @Param('periodId') periodId: string) {
        const statistics = await this.periodsService.lecturerGetStatisticsCompletionPhase(periodId, req.user.sub)
        return statistics
    }
}
