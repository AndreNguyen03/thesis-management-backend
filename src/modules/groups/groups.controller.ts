import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common'
import { Auth } from '../../auth/decorator/auth.decorator'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { GroupsService } from './application/groups.service'
import { PaginationQueryDto } from '../../common/pagination-an/dtos/pagination-query.dto'
import { plainToInstance } from 'class-transformer'
import { RequestPaginatedGroups, GroupDetailDto } from './dtos/get-groups.dtos'
import { ChatService } from './application/chat.service'
import { CreateDirectGroupDto } from './dtos/create-direct.dto'

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
        const group = await this.groupsService.getGroupDetail(id)

        return plainToInstance(GroupDetailDto, group, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Post('direct')
    async createOrGetDirectGroup(@Req() req: { user: ActiveUserData }, @Body() dto: CreateDirectGroupDto) {
        const group = await this.groupsService.createOrGetDirectGroup(req.user.sub, dto.targetUserId, dto.topicId)

        return {
            id: group._id.toString(),
            type: 'direct' as const,
            topicId: group.topicId ? group.topicId.toString() : null
        }
    }

    @Get('user-directs')
    async getUserDirectGroups(@Req() req: { user: ActiveUserData }, @Query() query: PaginationQueryDto) {
        return this.groupsService.getUserDirectGroups(req.user.sub, query)
    }
}
