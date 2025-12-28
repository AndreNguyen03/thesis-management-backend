import { forwardRef, Module } from '@nestjs/common'
import { Group, GroupSchema } from './schemas/groups.schemas'
import { MongooseModule } from '@nestjs/mongoose'
import { GroupsController } from './groups.controller'
import { GroupsService } from './application/groups.service'
import { GroupRepository } from './repository/impl/groups.repository'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'
import { UploadFilesModule } from '../upload-files/upload-files.module'
import { ChatGateway } from './gateway/chat.gateway'
import { OnlineService } from './application/online.service'
import { ChatService } from './application/chat.service'
import { Message, MessageSchema } from './schemas/messages.schemas'
import { CreateBatchGroupsProvider } from './provider/create-batch-groups.provider'
import { RegistrationsModule } from '../registrations/registrations.module'
import { GetGroupProvider } from './provider/get-group.provider'

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Group.name, schema: GroupSchema },
            { name: Message.name, schema: MessageSchema }
        ]),

        PaginationAnModule,
        forwardRef(() => UploadFilesModule),
        RegistrationsModule
    ],
    controllers: [GroupsController],
    providers: [
        GroupsService,
        {
            provide: 'IGroupRepository',
            useClass: GroupRepository
        },
        ChatGateway,
        OnlineService,
        ChatService,
        CreateBatchGroupsProvider,
        GetGroupProvider
    ],
    exports: [OnlineService, ChatService, GroupsService, CreateBatchGroupsProvider, GetGroupProvider]
})
export class GroupsModule {}
