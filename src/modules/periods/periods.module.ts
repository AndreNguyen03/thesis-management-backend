import { Module } from '@nestjs/common'
import { PeriodsController } from './periods.controller'
import { PeriodsService } from './application/periods.service'
import { PeriodRepository } from './repository/impl/perios.repository'
import { MongooseModule } from '@nestjs/mongoose'
import { PeriodSchema } from './schemas/period.schemas'
import { CreatePhaseProvider } from './application/create-phase.provider'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'
import { TopicModule } from '../topics/topic.module'

@Module({
    controllers: [PeriodsController],
    providers: [PeriodsService, { provide: 'IPeriodRepository', useClass: PeriodRepository }, CreatePhaseProvider],
    imports: [MongooseModule.forFeature([{ name: 'Period', schema: PeriodSchema }]), PaginationAnModule, TopicModule]
})
export class PeriodsModule {}
