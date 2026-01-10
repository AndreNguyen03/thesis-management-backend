import { Injectable } from '@nestjs/common'
import { PeriodsService } from '../application/periods.service'
import { Cron } from '@nestjs/schedule'

@Injectable()
export class PeriodsCronProvider {
    constructor(private readonly periodService: PeriodsService) {}

    // @Cron('*/1 * * * *')
    // async handlePhaseTimeout() {
    //     await this.periodService.checkAndEmitExpiredPhases()
    // }
}
