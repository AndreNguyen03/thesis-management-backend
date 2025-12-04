import { Module } from '@nestjs/common'
import { PeriodsController } from './periods.controller'
import { PeriodsService } from './application/periods.service'
import { PeriodRepository } from './repository/impl/periods.repository'
import { MongooseModule } from '@nestjs/mongoose'
import { PeriodSchema } from './schemas/period.schemas'
import { CreatePhaseProvider } from './providers/create-phase.provider'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'
import { TopicModule } from '../topics/topic.module'
import { GetPhaseProvider } from './providers/get-phase.provider'
import { ValidatePeriodPhaseProvider } from './providers/validate-phase.provider'
import { FacultySchema } from '../faculties/schemas/faculty.schema'
import { ValidatePeriodProvider } from './providers/validate-period.provider'
import { BullModule } from '@nestjs/bull'

@Module({
    controllers: [PeriodsController],
    providers: [
        PeriodsService,
        { provide: 'IPeriodRepository', useClass: PeriodRepository },
        CreatePhaseProvider,
        GetPhaseProvider,
        ValidatePeriodPhaseProvider,
        ValidatePeriodProvider
    ],
    imports: [
        MongooseModule.forFeature([
            { name: 'Period', schema: PeriodSchema },
            { name: 'Faculty', schema: FacultySchema }
        ]),
        PaginationAnModule,
        TopicModule,
        BullModule.registerQueue({ name: 'period' })
    ]
})
export class PeriodsModule {}
