import { forwardRef, Module } from '@nestjs/common'
import { Group, GroupSchema } from './schemas/groups.schemas'
import { MongooseModule } from '@nestjs/mongoose'
import { GroupsController } from './groups.controller'
import { GroupsService } from './application/groups.service'
import { GroupRepository } from './repository/impl/groups.repository'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'
import { UploadFilesModule } from '../upload-files/upload-files.module'

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema }]),
        PaginationAnModule,
        forwardRef(() => UploadFilesModule)
    ],
    controllers: [GroupsController],
    providers: [
        GroupsService,
        {
            provide: 'IGroupRepository',
            useClass: GroupRepository
        }
    ],
    exports: []
})
export class GroupsModule {}
