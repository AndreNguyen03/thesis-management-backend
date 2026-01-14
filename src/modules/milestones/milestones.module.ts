import { forwardRef, Module } from '@nestjs/common'
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
import { PeriodsModule } from '../periods/periods.module'
import { DefenseCouncil, DefenseCouncilSchema } from './schemas/defense-council.schema'
import { DefenseCouncilController } from './defense-council.controller'
import { DefenseCouncilService } from './application/defense-council.service'
import { DefenseCouncilRepository } from './repository/defense-council.repository'
import { DefensePdfProvider } from './providers/defense-pdf.provider'
import { DefenseAnalyticsProvider } from './providers/defense-analytics.provider'
import { CouncilRoleGuard } from './guards/council-role.guard'
import { MailModule } from '../../mail/mail.module'
import { StudentRegisterTopic, StudentRegisterTopicSchema } from '../registrations/schemas/ref_students_topics.schemas'
import { UsersModule } from '../../users/users.module'

@Module({
    controllers: [MilestonesController, DefenseCouncilController],
    providers: [
        MilestonesService,
        DefenseCouncilService,
        DefenseCouncilRepository,
        DefensePdfProvider,
        DefenseAnalyticsProvider,
        CouncilRoleGuard,
        {
            provide: 'IMilestoneRepository',
            useClass: MilestoneRepository
        }
    ],
    exports: [MilestonesService, DefenseCouncilService, 'IMilestoneRepository'],
    imports: [
        MongooseModule.forFeature([
            { name: Milestone.name, schema: MilestoneSchema },
            { name: MilestoneTemplate.name, schema: MilestoneTemplateSchema },
            { name: Topic.name, schema: TopicSchema },
            { name: DefenseCouncil.name, schema: DefenseCouncilSchema },
            { name: StudentRegisterTopic.name, schema: StudentRegisterTopicSchema }
        ]),
        UploadFilesModule,
        TodolistsModule,
        GroupsModule,
        PaginationAnModule,
        UsersModule,
        forwardRef(() => MailModule),
        forwardRef(() => PeriodsModule),
        forwardRef(() => TopicModule)
    ]
})
export class MilestonesModule {}
