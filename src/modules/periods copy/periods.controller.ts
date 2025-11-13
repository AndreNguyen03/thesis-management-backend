import { Body, Controller, Post } from '@nestjs/common'
import { PeriodsService } from './application/periods.service'
import { CreatePeriodDto } from './dtos/create-period.dtos'

@Controller('periods')
export class PeriodsController {
    constructor(private readonly periodsService: PeriodsService) {}
    // Tạo kì/ đợt đăng ký mới
    @Post()
    createNewPeriod(@Body() createPeriodDto: CreatePeriodDto) {
        return this.periodsService.createNewPeriod(createPeriodDto)
    }
}
