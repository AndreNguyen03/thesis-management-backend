import { Controller, Get, Param, Query, Req } from '@nestjs/common'
import { Auth } from '../../auth/decorator/auth.decorator'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { GroupsService } from './application/groups.service'
import { PaginationQueryDto } from '../../common/pagination-an/dtos/pagination-query.dto'
import { plainToInstance } from 'class-transformer'
import { RequestPaginatedGroups } from './dtos/get-groups.dtos'
import { ChatService } from './application/chat.service'

@Controller('groups')
export class GroupsController {
    constructor(
        private readonly groupsService: GroupsService,
        private readonly chatService: ChatService
    ) {}

    @Get('/:groupId/messages')
    async getGroupMessages(
        @Req() req: { user: ActiveUserData },
        @Param('groupId') groupId: string,
        @Query('before') before?: string,
        @Query('limit') limit?: string
    ) {
        return this.chatService.getGroupMessages({
            groupId,
            userId: req.user.sub,
            limit: limit ? parseInt(limit, 10) : undefined,
            before: before ? new Date(before) : undefined
        })
    }

    @Get('/:groupId/search')
    async searchGroupMessages(
        @Req() req: { user: ActiveUserData },
        @Param('groupId') groupId: string,
        @Query('keyword') keyword: string,
        @Query('limit') limit?: string
    ) {
        return this.chatService.searchGroupMessages({
            groupId,
            userId: req.user.sub,
            keyword,
            limit: limit ? parseInt(limit, 10) : undefined
        })
    }

    //Lấy tất các nhóm của user
    @Get()
    async getGroups(@Req() req: { user: ActiveUserData }, @Query() query: PaginationQueryDto) {
        const res = await this.groupsService.getGroupsOfUser(req.user.sub, query)
        return plainToInstance(RequestPaginatedGroups, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Get('/detail/:id')
    async getGroupDetail(@Param('id') id: string) {
        console.log('group detail id', id)
        return await this.groupsService.getGroupDetail(id)
    }
}
