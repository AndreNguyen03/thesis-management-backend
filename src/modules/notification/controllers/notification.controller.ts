import { Controller, Param, Post, Req } from '@nestjs/common'
import { NotificationService } from '../services/notification.service'

@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Post(':id/mark-read')
    async markRead(@Param('id') id: string) {
        return await this.notificationService.markRead(id)
    }

    @Post('mark-read-all')
    async markReadAl(@Req() req) {
        const userId = req.user.sub
        return await this.notificationService.markReadAll(userId)
    }
}
