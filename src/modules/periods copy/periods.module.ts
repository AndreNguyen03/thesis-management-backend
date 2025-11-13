import { Module } from '@nestjs/common'
import { PeriodsController } from './periods.controller'
import { PeriodsService } from './application/periods.service'
import { PeriodRepository } from './repository/imple/perios.repository'
import { Mongoose } from 'mongoose'
import { MongooseModule } from '@nestjs/mongoose'
import { PeriodSchema } from './schemas/period.schemas'

@Module({
    controllers: [PeriodsController],
    providers: [PeriodsService, { provide: 'IPeriodRepository', useClass: PeriodRepository }],
    imports: [MongooseModule.forFeature([{ name: 'Period', schema: PeriodSchema }])]
})
export class PeriodsModudle {}
