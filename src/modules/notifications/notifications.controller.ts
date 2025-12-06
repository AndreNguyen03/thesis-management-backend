import { Controller, Post, Body, Req, Param, Get } from '@nestjs/common'
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

    @Post(':id/mark-read')
    async markRead(@Param('id') id: string) {
        return await this.notificationsService.markRead(id)
    }

    @Post('mark-read-all')
    async markReadAl(@Req() req) {
        const userId = req.user.sub
        return await this.notificationsService.markReadAll(userId)
    }

    @Get("user/:userId")
    async getUserNotifications(@Param('userId') userId: string) {
        return await this.notificationsService.getUserNotifications(userId)
    }
}
