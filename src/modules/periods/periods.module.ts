import { forwardRef, Module } from '@nestjs/common'
import { PeriodsController } from './periods.controller'
import { PeriodsService } from './application/periods.service'
import { PeriodRepository } from './repository/impl/periods.repository'
import { MongooseModule } from '@nestjs/mongoose'
import { PeriodSchema } from './schemas/period.schemas'
import { CreatePhaseProvider } from './providers/create-phase.provider'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'
import { TopicModule } from '../topics/topic.module'
import { ValidatePeriodPhaseProvider } from './providers/validate-phase.provider'
import { FacultySchema } from '../faculties/schemas/faculty.schema'
import { ValidatePeriodProvider } from './providers/validate-period.provider'
import { BullModule } from '@nestjs/bull'
import { TopicVectorModule } from '../topic_search/topic_search.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { GetPeriodInfoProvider } from './providers/get-period-info.provider'
import { GroupsModule } from '../groups/groups.module'
import { FacultyModule } from '../faculties/faculty.module'
import { PeriodGateway } from './gateways/period.gateway'
import { PeriodsCronProvider } from './cron/periods-cron.provider'
import { ScheduleModule } from '@nestjs/schedule'

@Module({
    controllers: [PeriodsController],
    providers: [
        PeriodsService,
        { provide: 'IPeriodRepository', useClass: PeriodRepository },
        CreatePhaseProvider,
        GetPeriodInfoProvider,
        ValidatePeriodPhaseProvider,
        ValidatePeriodProvider,
        PeriodGateway,
        PeriodsCronProvider
    ],
    imports: [
        ScheduleModule.forRoot(),
        MongooseModule.forFeature([
            { name: 'Period', schema: PeriodSchema },
            { name: 'Faculty', schema: FacultySchema }
        ]),
        PaginationAnModule,
        forwardRef(() => TopicModule),
        BullModule.registerQueue({ name: 'period' }),
        TopicVectorModule,
        NotificationsModule,
        GroupsModule,
        FacultyModule
    ],
    exports: [PeriodsService, GetPeriodInfoProvider, PeriodGateway]
})
export class PeriodsModule {}
