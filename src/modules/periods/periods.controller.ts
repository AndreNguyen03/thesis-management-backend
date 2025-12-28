import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { PeriodsService } from './application/periods.service'
import {
    CreatePeriodDto,
    GetCurrentPeriod,
    GetPaginatedPeriodDto,
    GetPeriodDto,
    PeriodStatsQueryParams,
    UpdatePeriodDto
} from './dtos/period.dtos'
import { RequestGetPeriodsDto } from './dtos/request-get-all.dto'
import { plainToInstance } from 'class-transformer'
import {
    ConfigCompletionPhaseDto,
    ConfigExecutionPhaseDto,
    ConfigOpenRegPhaseDto,
    ConfigPhaseSubmitTopicDto,
    GetPeriodPhaseDto,
    UpdatePeriodPhaseDto
} from './dtos/period-phases.dtos'
import {
    GetGeneralTopics,
    PaginatedGeneralTopics,
    PaginatedTopicsInPeriod,
    RequestGetTopicsInPhaseParams,
    RequestLectureGetTopicsInPhaseParams
} from '../topics/dtos'
import { UserRole } from '../../auth/enum/user-role.enum'
import { Roles } from '../../auth/decorator/roles.decorator'
import { RolesGuard } from '../../auth/guards/roles/roles.guard'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { Period } from './schemas/period.schemas'
import { GetStatiticInPeriod } from './dtos/statistic.dtos'
import { PeriodPhaseName } from './enums/period-phases.enum'
import { Phase1Response, Phase2Response, Phase3Response, Phase4Response } from './dtos/phase-resolve.dto'
import { TopicSearchService } from '../topic_search/application/search.service'
import { GetTopicProvider } from '../topics/providers/get-topic.provider'

@Controller('periods')
export class PeriodsController {
    constructor(
        private readonly periodsService: PeriodsService,
        private readonly getTopicProvider: GetTopicProvider
    ) {}

    // Tạo kì/ đợt đăng ký mới
    @Post()
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async createNewPeriod(@Req() req: { user: ActiveUserData }, @Body() createPeriodDto: CreatePeriodDto) {
        const mess = await this.periodsService.createNewPeriod(req.user.sub, req.user.facultyId!, createPeriodDto)
        return { message: `Kỳ mới đã được tạo thành công. ${mess}` }
    }

    // Lấy tất cả các kỳ
    @Get('/get-all')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async getAllPeriods(@Req() req: { user: ActiveUserData }, @Query() query: RequestGetPeriodsDto) {
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
        const res = await this.periodsService.adjustPeriod(periodId, adjustPeriodDto)
        return plainToInstance(GetPeriodDto, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
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
        const res = await this.periodsService.getPeriodInfo(periodId)
        return plainToInstance(GetPeriodDto, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Patch('/:periodId/config-submit-topic-phase')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async configSubmitTopicPhase(
        @Req() req: { user: ActiveUserData },
        @Param('periodId') periodId: string,
        @Body() configPhaseSubmitTopicDto: ConfigPhaseSubmitTopicDto,
        @Query('force') force: boolean
    ) {
        await this.periodsService.configPhaseSubmitTopic(req.user.sub, periodId, configPhaseSubmitTopicDto, force)
        return { message: 'Thiết lập giai đoạn "nộp đề tài" thành công' }
    }

    @Patch(':periodId/config-execution-phase')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async configExecutionPhase(
        @Req() req: { user: ActiveUserData },
        @Param('periodId') periodId: string,
        @Body() configExecutionPhaseDto: ConfigExecutionPhaseDto,
        @Query('force') force: boolean
    ) {
        return await this.periodsService.configPhaseExecution(req.user.sub, periodId, configExecutionPhaseDto, force)
    }

    @Patch(':periodId/config-open-reg-phase')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async configOpenRegPhase(
        @Req() req: { user: ActiveUserData },
        @Param('periodId') periodId: string,
        @Body() configOpenRegPhaseDto: ConfigOpenRegPhaseDto,
        @Query('force') force: boolean
    ) {
        return await this.periodsService.configPhaseOpenReg(req.user.sub, periodId, configOpenRegPhaseDto, force)
    }

    @Patch(':periodId/config-completion-phase')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async configCompletionPhase(
        @Req() req: { user: ActiveUserData },
        @Param('periodId') periodId: string,
        @Body() configCompletionPhaseDto: ConfigCompletionPhaseDto
    ) {
        await this.periodsService.configPhaseCompletion(req.user.sub, periodId, configCompletionPhaseDto)
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

    //Lấy những đề tài nằm trong pha cụ thể, trạng thái cụ thể
    @Get('/:periodId/get-topics-in-phase')
    async getTopicsInPhase(@Param('periodId') periodId: string, @Query() query: RequestGetTopicsInPhaseParams) {
        const topics = await this.periodsService.getTopicsInPhase(periodId, query)
        return plainToInstance(PaginatedTopicsInPeriod, topics, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    //Giảng viên lấy những đề tài mà mình hướng dẫn trong pha cụ thể của kì cụ thể
    @Get('/:periodId/lecturer/get-topics-in-phase')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards(RolesGuard)
    async lecturerGetTopicsInPhase(
        @Req() req: { user: ActiveUserData },
        @Param('periodId') periodId: string,
        @Query() query: RequestLectureGetTopicsInPhaseParams
    ) {
        const topics = await this.getTopicProvider.lecturerGetTopicsInPhase(req.user.sub, periodId, query)
        return plainToInstance(PaginatedTopicsInPeriod, topics, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    // // Thay đổi trạng thái toàn bộ đề tài thuộc kì này, khi chuyển pha này sang pha khác
    // @Patch('/:periodId/status/tranfer-phase')
    // async changeStatusAllTopicsInPeriod(
    //     @Param('periodId') periodId: string,
    //     @Body() body: { newStatus: string; newPhaseId: string }
    // ) {
    //     // Logic để thay đổi trạng thái đề tài
    //     await this.periodsService.changeStatusAllTopicsInPeriod(periodId, body.newStatus, body.newPhaseId)
    //     return { message: 'Đã thay đổi trạng thái đề tài thành công' }
    // }

    //BCN khoa lấy thông kê trong kì theo các pha
    @Get('/:periodId/faculty-board/stats')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async getStatisticsInPeriods(@Param('periodId') periodId: string, @Query() query: PeriodStatsQueryParams) {
        const statistics = await this.periodsService.boardGetStatisticsInPeriod(periodId, query)
        return plainToInstance(GetStatiticInPeriod, statistics, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
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

    // @Get('/me/submission-status')
    // @Auth(AuthType.Bearer)
    // @Roles(UserRole.LECTURER)
    // @UseGuards(RolesGuard)
    // async getSubmissionStatus(@Req() req: { user: ActiveUserData }) {
    //     const status = await this.periodsService.getSubmissionStatus(req.user.sub, req.user.facultyId!)
    //     return status
    // }

    //Lấy thông tin của kỳ hiện tại
    @Get('/current-periods')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER, UserRole.FACULTY_BOARD, UserRole.STUDENT)
    @UseGuards(RolesGuard)
    async getCurrentPeriods(@Req() req: { user: ActiveUserData }) {
        console.log(' user :::', req.user)
        const res = await this.periodsService.getCurrentPeriods(req.user.facultyId!, req.user.role, req.user.sub)
        console.log('get current period data ::: ', res)
        return plainToInstance(GetCurrentPeriod, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

       //Lấy thông tin của kỳ hiện tại
    @Get('/dashboard-current-periods')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER, UserRole.FACULTY_BOARD, UserRole.STUDENT)
    @UseGuards(RolesGuard)
    async getDashboardCurrentPeriods(@Req() req: { user: ActiveUserData }) {
        console.log(' user :::', req.user)
        const res = await this.periodsService.getDashboardCurrentPeriod(req.user.facultyId!)
        console.log('get current period data ::: ', res)
        return res
        return plainToInstance(GetCurrentPeriod, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    //kierm tra xem hàm có thể đóng hay chưa
    @Post('/:periodId/phases/:phase/resolve')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async closePhase(
        @Param('periodId') periodId: string,
        @Param('phase') phase: PeriodPhaseName
    ): Promise<Phase1Response | Phase2Response | Phase3Response | Phase4Response> {
        return this.periodsService.closePhase(
            periodId,
            phase
            //    , req.user
        )
    }

    @Patch("/:period/period-complete")
    async completePeriod(@Param('period') periodId: string) {
        await this.periodsService.completePeriod(periodId);
        return { message: "Kỳ đã được hoàn thành thành công" }
    }
}
