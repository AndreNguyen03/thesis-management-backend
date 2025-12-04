import { Controller, Post, Body, Req } from '@nestjs/common'
import { NotificationsService } from './application/notifications.service'
import { CreateAndSend } from './dto/create-and-send.dtos'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Post()
    async createAndSend(@Req() req: { user: ActiveUserData }, @Body() createDto: CreateAndSend) {
        return this.notificationsService.createAndSend(req.user.sub, createDto)
    }
}
