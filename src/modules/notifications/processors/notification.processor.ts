import { Process, Processor } from '@nestjs/bull'
import { OnlineUserService } from '../application/online-user.service'
import { Job } from 'bull'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { NotFoundException } from '@nestjs/common'
import { MailService } from '../../../mail/providers/mail.service'
import { UserService } from '../../../users/application/users.service'
import { NotificationsGateway } from '../gateways/notifications.gateway'
import { Notification } from '../schemas/notification.schemas'

@Processor('notifications')
export class NotificationQueueProcessor {
    constructor(
        private readonly notiGateway: NotificationsGateway,
        private readonly onlineUserService: OnlineUserService,
        private readonly mailService: MailService,
        private readonly userService: UserService,
        @InjectModel(Notification.name)
        private readonly notiModel: Model<Notification>
    ) {}
    //Gửi thông báo mới nhất riêng cho một user, trên nhiều thiết bị
    @Process('send-notification')
    async handleSendNotification(job: Job) {
        const { _id, recipientId, title, message, createdAt, type, isRead, metadata } = job.data
        const isOnline = await this.onlineUserService.isUserOnline(recipientId)
        console.log(`Is user ${recipientId} online?`, isOnline)
        if (isOnline) {
            this.notiGateway.server
                .to('user_' + recipientId)
                .emit('notification', { _id, title, message, createdAt, type, isRead, metaData: metadata })
            console.log(`Notification sent to user ${recipientId} via WebSocket.`)
        }
        //code cũ không cần thiết vì cứ một trình duyệt mở socket là được đnagư ký trong roome user_{userId} rùi
        //không cần thiết phải gửi từng socket của user nữa => mất đi tính tiện lợi của chức năng tạo room của socket
    }

    @Process('mark-read-all')
    async handleMarkReadAll(job: Job<{ userId: string }>) {
        const { userId } = job.data

        // update db
        await this.notiModel.updateMany({ userId, isRead: false }, { isRead: true })

        // emit ws to all user socket (if user has more than 1 device access to app)
        // const sockets = await this.onlineUserService.getSockets(userId)
        // sockets.forEach((sid) => {

        //   })
    }

    @Process('mark-read')
    async handleMarkRead(job: Job<{ notificationId: string }>) {
        const { notificationId } = job.data

        const noti = await this.notiModel.findByIdAndUpdate({ _id: notificationId }, { seen: true })

        if (!noti) throw new NotFoundException('Notification not found')

        const sockets = await this.onlineUserService.getSockets(noti?.recipientId.toString())
        sockets.forEach((sid) => {
            this.notiGateway.server.to(sid).emit('notification-marked-read', { notificationId })
        })
    }

    @Process('send-email')
    async handleSendEmail(job: Job<{ recipientId: string; subject: string; content: string }>) {
        const { recipientId, subject, content } = job.data

        const user = await this.userService.findById(recipientId)

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
