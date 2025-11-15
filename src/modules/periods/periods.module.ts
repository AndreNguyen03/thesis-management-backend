import { Module } from '@nestjs/common'
import { PeriodsController } from './periods.controller'
import { PeriodsService } from './application/periods.service'
import { PeriodRepository } from './repository/impl/perios.repository'
import { MongooseModule } from '@nestjs/mongoose'
import { PeriodSchema } from './schemas/period.schemas'
import { CreatePhaseProvider } from './providers/create-phase.provider'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'
import { TopicModule } from '../topics/topic.module'
import { GetPhaseProvider } from './providers/get-phase.provider'
import { ValidatePeriodPhaseProvider } from './providers/validate-phase.provider'

@Module({
    controllers: [PeriodsController],
    providers: [
        PeriodsService,
        { provide: 'IPeriodRepository', useClass: PeriodRepository },
        CreatePhaseProvider,
        GetPhaseProvider,
        ValidatePeriodPhaseProvider
    ],
    imports: [MongooseModule.forFeature([{ name: 'Period', schema: PeriodSchema }]), PaginationAnModule, TopicModule]
})
export class PeriodsModule {}
