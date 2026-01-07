import { Controller, Post, Body, Req, Param, Get, Query, UseGuards } from '@nestjs/common'
import { NotificationsService } from './application/notifications.service'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { RequestReminderLecturers } from './dtos/request.dtos'
import { NotificationPublisherService } from './publisher/notification.publisher.service'
import { plainToInstance } from 'class-transformer'
import { GetNotificationDto, PaginationNotificationDto } from './dtos/get-notifications'
import { PaginationQueryDto } from '../../common/pagination-an/dtos/pagination-query.dto'
import { Roles } from '../../auth/decorator/roles.decorator'
import { RolesGuard } from '../../auth/guards/roles/roles.guard'
import { UserRole } from '../../auth/enum/user-role.enum'
import { SendCustomNotificationDto } from './dtos/send-custom-notificaition.dtos'

@Controller('notifications')
export class NotificationsController {
    constructor(
        private readonly notificationsService: NotificationsService,
        private readonly notificationPublisherService: NotificationPublisherService
    ) {}

    @Post(':id/mark-read')
    async markRead(@Param('id') id: string) {
        return await this.notificationsService.markRead(id)
    }

    @Post('mark-all-read')
    async markReadAl(@Req() req: { user: ActiveUserData }) {
        const userId = req.user.sub
        return await this.notificationsService.markReadAll(userId)
    }

    @Get('user')
    async getUserNotifications(@Req() req: { user: ActiveUserData }, @Query() query: PaginationQueryDto) {
        const userId = req.user.sub
        const res = await this.notificationsService.getUserNotifications(userId, query)
        return plainToInstance(PaginationNotificationDto, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    @Post('remain-issue')
    async remindLecturerSubmitTopicInPeriod(
        @Req() req: { user: ActiveUserData },
        @Body() body: RequestReminderLecturers
    ) {
        return await this.notificationPublisherService.sendReminderLecturerInPeriod(body, req.user.sub)
    }

    @Post('send-custom')
    @Roles(UserRole.FACULTY_BOARD)
    @UseGuards(RolesGuard)
    async sendCustomNotification(@Req() req: { user: ActiveUserData }, @Body() dto: SendCustomNotificationDto) {
        const result = await this.notificationPublisherService.sendCustomNotification(req.user.sub, req.user.facultyId!, dto)
        return {
            message: 'Gửi thông báo thành công',
            sentCount: result.sentCount
        }
    }
}
