import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { PeriodsService } from './application/periods.service'
import { CreatePeriodDto, GetPeriodDto, UpdatePeriodDto } from './dtos/period.dtos'
import { RequestGetPeriodsDto } from './dtos/request-get-all.dto'
import { plainToInstance } from 'class-transformer'
import {
    CreateCompletionPhaseDto,
    CreateExecutionPhaseDto,
    CreateOpenRegPhaseDto,
    CreatePhaseSubmitTopicDto,
    GetPeriodPhaseDto,
    UpdatePeriodPhaseDto
} from './dtos/period-phases'
import { RequestGetTopicsInPeriodDto, RequestGetTopicsInPhaseDto } from '../topics/dtos'

@Controller('periods')
export class PeriodsController {
    constructor(private readonly periodsService: PeriodsService) {}
    
    // Tạo kì/ đợt đăng ký mới
    @Post()
    async createNewPeriod(@Body() createPeriodDto: CreatePeriodDto) {
        await this.periodsService.createNewPeriod(createPeriodDto)
        return { message: 'Kỳ mới đã được tạo thành công' }
    }

    // Lấy tất cả các kỳ
    @Get('/get-all')
    async getAllPeriods(@Query() query: RequestGetPeriodsDto) {
        return this.periodsService.getAllPeriods(query)
    }

    @Delete('delete-period/:id')
    async deletePeriod(@Param('id') id: string) {
        await this.periodsService.deletePeriod(id)
        return { message: 'Xóa kỳ thành công' }
    }
    // Thay đổi thoong tin kỳ
    @Patch('adjust-period/:periodId')
    async adjustPeriod(@Param('periodId') periodId: string, @Body() adjustPeriodDto: UpdatePeriodDto) {
        await this.periodsService.adjustPeriod(periodId, adjustPeriodDto)
        return { message: 'Điều chỉnh kỳ thành công' }
    }

    // Set kỳ đã kết thúc
    @Patch('period-completed/:periodId')
    async setPeriodEnded(@Param('periodId') periodId: string) {
        await this.periodsService.setPeriodCompleted(periodId)
        return { message: 'Đã đặt kỳ là kết thúc' }
    }

    //Lấy thông tin của kì
    @Get('get-period/:periodId')
    async getPeriodInfo(@Param('periodId') periodId: string) {
        const res = await this.periodsService.getPeriodInfo(periodId)
        return plainToInstance(GetPeriodPhaseDto, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Patch(':periodId/create-submit-topic-phase')
    async createSubmitTopicPhase(
        @Param('periodId') periodId: string,
        @Body() createPhaseSubmitTopicDto: CreatePhaseSubmitTopicDto
    ) {
        await this.periodsService.createPhaseSubmitTopic(periodId, createPhaseSubmitTopicDto)
        return { message: 'Tạo giai đoạn "nộp đề tài" thành công' }
    }

    @Patch(':periodId/create-execution-phase')
    async createExecutionPhase(
        @Param('periodId') periodId: string,
        @Body() createExecutionPhaseDto: CreateExecutionPhaseDto
    ) {
        await this.periodsService.createPhaseExecution(periodId, createExecutionPhaseDto)
        return { message: 'Tạo giai đoạn "nộp đề tài" thành công' }
    }

    @Patch(':periodId/create-open-reg-phase')
    async createOpenRegPhase(
        @Param('periodId') periodId: string,
        @Body() createOpenRegPhaseDto: CreateOpenRegPhaseDto
    ) {
        await this.periodsService.createPhaseOpenReg(periodId, createOpenRegPhaseDto)
        return { message: 'Tạo giai đoạn "mở đăng ký" thành công' }
    }

    @Patch(':periodId/create-completion-phase')
    async createCompletionPhase(
        @Param('periodId') periodId: string,
        @Body() createCompletionPhaseDto: CreateCompletionPhaseDto
    ) {
        await this.periodsService.createPhaseCompletion(periodId, createCompletionPhaseDto)
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


    // Thay đổi trạng thái toàn bộ đề tài thuộc kì này, khi chuyển pha này sang pha khác
    @Patch('/:periodId/status/tranfer-phase')
    async changeStatusAllTopicsInPeriod(
        @Param('periodId') periodId: string,
        @Param('topicId') topicId: string,
        @Body() body: { newStatus: string; newPhaseId: string }
    ) {
        // Logic để thay đổi trạng thái đề tài
        await this.periodsService.changeStatusAllTopicsInPeriod(periodId, body.newStatus, body.newPhaseId)
        return { message: 'Đã thay đổi trạng thái đề tài thành công' }
    }
    //Lấy thống kế ở pha 1 - pha nộp đề tàii
    @Get('/:periodId/statistics/submit-topic-phase')
    async getStatisticsSubmitTopicPhase(@Param('periodId') periodId: string) {
        const statistics = await this.periodsService.getStatisticsSubmitTopicPhase(periodId)
        return statistics
    }
    //Lấy thống kế ở pha 2 - pha đăng ký đề tài
    @Get('/:periodId/statistics/open-registration-phase')
    async getStatisticsOpenRegistrationPhase(@Param('periodId') periodId: string) {
        const statistics = await this.periodsService.getStatisticsOpenRegistrationPhase(periodId)
        return statistics
    }
    //Lấy thống kế ở pha 3 - pha thực hiện đề tài
    @Get('/:periodId/statistics/execution-phase')
    async getStatisticsExecutionPhase(@Param('periodId') periodId: string) {
        const statistics = await this.periodsService.getStatisticsExecutionPhase(periodId)
        return statistics
    }
    //Lấy thống kế ở pha 4 - pha hoàn thành đề tài
    @Get('/:periodId/statistics/completion-phase')
    async getStatisticsCompletionPhase(@Param('periodId') periodId: string) {
        const statistics = await this.periodsService.getStatisticsCompletionPhase(periodId)
        return statistics
    }
}
