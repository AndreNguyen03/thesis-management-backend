import { Controller, Get, Param, Query, Req } from '@nestjs/common'
import { Auth } from '../../auth/decorator/auth.decorator'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { GroupsService } from './application/groups.service'
import { PaginationQueryDto } from '../../common/pagination-an/dtos/pagination-query.dto'
import { plainToInstance } from 'class-transformer'
import { RequestPaginatedGroups } from './dtos/get-groups.dtos'

@Controller('groups')
export class GroupsController {
    constructor(private readonly groupsService: GroupsService) {}
    //Lấy tất các nhóm của user
    @Get()
    async getGroups(@Req() req: { user: ActiveUserData }, @Query() query: PaginationQueryDto) {
        const res = await this.groupsService.getGroupsOfUser(req.user.sub, query)
        return res
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
