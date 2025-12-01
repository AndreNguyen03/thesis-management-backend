import { Process, Processor } from '@nestjs/bull'
import { NotificationGateway } from '../gateways/notification.gateway'
import { OnlineUserService } from '../services/online-user.service'
import { Job } from 'bull'
import { Notification, NotificationDocument } from '../schemas/notification.schema'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { NotFoundException } from '@nestjs/common'
import { MailService } from '../../../mail/providers/mail.service'
import { User } from '../../../users/schemas/users.schema'
import { UserService } from '../../../users/application/users.service'

@Processor('notifications')
export class NotificationQueueProcessor {
    constructor(
        private readonly notiGateway: NotificationGateway,
        private readonly onlineUserService: OnlineUserService,
        private readonly mailService: MailService,
        private readonly userService: UserService,
        @InjectModel(Notification.name)
        private readonly notiModel: Model<NotificationDocument>
    ) {}

    @Process('send-notification')
    async handleSendNotification(job: Job) {
        const { userId, content, meta, type, link } = job.data

        const isOnline = await this.onlineUserService.isUserOnline(userId)
        if (isOnline) {
            const sockets = await this.onlineUserService.getSockets(userId)
            sockets.forEach((sid) => {
                this.notiGateway.server.to(sid).emit('notification', { content, meta, type, link })
            })
        }
    }

    @Process('mark-read-all')
    async handleMarkReadAll(job: Job<{ userId: string }>) {
        const { userId } = job.data

        // update db
        await this.notiModel.updateMany({ userId, seen: false }, { seen: true })

        // emit ws to all user socket
        const sockets = await this.onlineUserService.getSockets(userId)
        sockets.forEach((sid) => {
            this.notiGateway.server.to(sid).emit('notifications-marked-read-all')
        })
    }

    @Process('mark-read')
    async handleMarkRead(job: Job<{ notificationId: string }>) {
        const { notificationId } = job.data

        const noti = await this.notiModel.findByIdAndUpdate({ _id: notificationId }, { seen: true })

        if (!noti) throw new NotFoundException('Notification not found')

        const sockets = await this.onlineUserService.getSockets(noti?.userId.toString())
        sockets.forEach((sid) => {
            this.notiGateway.server.to(sid).emit('notification-marked-read', { notificationId })
        })
    }

    @Process('send-email')
    async handleSendEmail(job: Job<{ userId: string; subject: string; content: string }>) {
        const { userId, subject, content } = job.data

        const user = await this.userService.findById(userId)

        if (!user) throw new NotFoundException('Not found user!')

        try {
            await this.mailService.sendNotificationMail(user, subject, content)
            console.log(`Email notification sent to ${user.email}`)
        } catch (error) {
            console.error(`Failed to send email to ${user.email}`, error)
            throw error
        }
    }
}
