import { Module } from '@nestjs/common'
import { MilestonesController } from './milestones.controller'
import { MilestonesService } from './application/milestones.service'
import { MilestoneRepository } from './repository/impl/milestone.repository'
import { MongooseModule } from '@nestjs/mongoose'
import { Milestone, MilestoneSchema } from './schemas/milestones.schemas'
import { UploadFilesModule } from '../upload-files/upload-files.module'
import { TodolistsModule } from '../todolists/todolists.module'
import { GroupsModule } from '../groups/groups.module'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'
import { MilestoneTemplate, MilestoneTemplateSchema } from './schemas/milestones-templates.schema'
import { Topic, TopicSchema } from '../topics/schemas/topic.schemas'
import { TopicModule } from '../topics/topic.module'

@Module({
    controllers: [MilestonesController],
    providers: [
        MilestonesService,
        {
            provide: 'IMilestoneRepository',
            useClass: MilestoneRepository
        },
        
    ],
    imports: [
        MongooseModule.forFeature([
            { name: Milestone.name, schema: MilestoneSchema },
            { name: MilestoneTemplate.name, schema: MilestoneTemplateSchema },
            { name: Topic.name, schema: TopicSchema }
        ]),
        UploadFilesModule,
        TodolistsModule,
        GroupsModule,
        PaginationAnModule,
        TopicModule
    ]
})
export class MilestonesModule {}
