import { Process, Processor } from '@nestjs/bull'
import { PeriodGateway } from '../gateways/period.gateway'

@Processor('period')
export class PeriodProcessor {
    constructor(private readonly periodGateway: PeriodGateway) {}

    @Process('period-dashboard-update')
    async handlePeriodDashboardUpdate() {
        this.periodGateway.emitPeriodDashboardUpdate({})
    }
}
