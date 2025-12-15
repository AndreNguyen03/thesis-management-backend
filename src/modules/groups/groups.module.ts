import { Module } from '@nestjs/common'
import { Group, GroupSchema } from './schemas/groups.schemas'
import { MongooseModule } from '@nestjs/mongoose'
import { GroupsController } from './groups.controller'
import { GroupsService } from './application/groups.service'
import { GroupRepository } from './repository/impl/groups.repository'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'
import { ChatGateway } from './gateway/chat.gateway'
import { OnlineService } from './application/online.service'
import { ChatService } from './application/chat.service'
import { Message, MessageSchema } from './schemas/messages.schemas'

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Group.name, schema: GroupSchema },
            { name: Message.name, schema: MessageSchema }
        ]),
        PaginationAnModule
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
        ChatService
    ],
    exports: [OnlineService, ChatService, GroupsService]
})
export class GroupsModule {}
