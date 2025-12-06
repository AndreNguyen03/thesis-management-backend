import { InjectQueue } from '@nestjs/bull'
import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Queue } from 'bull'
import { Model } from 'mongoose'
import { Notification, NotificationType } from '../schemas/notification.schemas'
import { OnlineUserService } from '../application/online-user.service'
import { NotificationsGateway } from '../gateways/notifications.gateway'

@Injectable()
export class NotificationPublisherService {
    constructor(
        @InjectModel(Notification.name)
        private readonly notiModel: Model<Notification>,
        @InjectQueue('notifications')
        private readonly queue: Queue
    ) {}
    //Tạo và gửi thông báo cho một người dùng
    async createAndSendNoti(
        recipientId: string,
        senderId: string,
        title: string,
        message: string,
        type: NotificationType,
        meta?: Record<string, any>,
        isSendMail?: boolean,
        contentEmail?: string
    ) {
        // save to db
        let noti
        try {
            noti = (await this.notiModel.create({ recipientId, senderId, title, message, meta, type })).toObject()
        } catch (error) {
            throw new BadRequestException('Không thể tạo thông báo')
        }
        console.log('Created notification:', noti)
        // push job to queue để hiển thị lên tức thời
        await this.queue.add('send-notification', {
            _id: noti._id,
            recipientId,
            title,
            message,
            type,
            isRead: noti.isRead, // false
            createdAt: noti.createdAt,
            metadata: meta
        })
        if (isSendMail) {
            await this.queue.add('send-email', {
                recipientId,
                subject: 'Bạn có thông báo mới',
                content: contentEmail
            })
        }
        return noti
    }

    //TÍnh gửi dạng pop-up hả ?
    // async sendUnseenNotifications(userId: string) {
    //     const unseenNotis = await this.notiModel.find({ userId, seen: false }).lean()
    //     for (const noti of unseenNotis) {
    //         await this.queue.add('send-notification', {
    //             userId,
    //             message: noti.message,
    //             metadata: noti.metadata,
    //             type: noti.type,
    //             link: noti.link,
    //             createdAt: new Date()
    //         })
    //     }
    // }
}
