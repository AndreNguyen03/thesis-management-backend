import { Module } from '@nestjs/common'
import { MilestonesController } from './milestones.controller'
import { MilestonesService } from './application/milestones.service'
import { MilestoneRepository } from './repository/impl/milestone.repository'
import { MongooseModule } from '@nestjs/mongoose'
import { Milestone, MilestoneSchema } from './schemas/milestones.schemas'
import { UploadFilesModule } from '../upload-files/upload-files.module'
import { TodolistsModule } from '../todolists/todolists.module'

@Module({
    controllers: [MilestonesController],
    providers: [
        MilestonesService,
        {
            provide: 'IMilestoneRepository',
            useClass: MilestoneRepository
        }
    ],
    imports: [
        MongooseModule.forFeature([
            { name: Milestone.name, schema: MilestoneSchema }
        ]),
        UploadFilesModule,
        TodolistsModule
    ]
})
export class MilestonesModule {}
