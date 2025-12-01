import { InjectQueue } from '@nestjs/bull'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Queue } from 'bull'
import { Model } from 'mongoose'
import { NotificationDocument } from '../schemas/notification.schema'

@Injectable()
export class NotificationPublisherService {
    constructor(
        @InjectModel(Notification.name)
        private readonly notiModel: Model<NotificationDocument>,
        @InjectQueue('notifications')
        private readonly queue: Queue
    ) {}

    async createAndSendNoti(
        userId: string,
        content: string,
        meta?: Record<string, any>,
        type: string = 'system',
        link?: string,
        sendEmail = false
    ) {
        // save to db
        const noti = await this.notiModel.create({ userId, content, meta, type, link })

        // push job to queue
        await this.queue.add('send-notification', {
            userId,
            content,
            meta,
            type,
            link,
            createdAt: noti.createdAt
        })

        if (sendEmail) {
            await this.queue.add('send-mail', {
                userId,
                subject: 'Bạn có thông báo mới',
                content
            })
        }
        return noti
    }

    async sendUnseenNotifications(userId: string) {
        const unseenNotis = await this.notiModel.find({ userId, seen: false }).lean()
        for (const noti of unseenNotis) {
            await this.queue.add('send-notification', {
                userId,
                content: noti.content,
                meta: noti.meta,
                type: noti.type,
                link: noti.link,
                createdAt: noti.createdAt
            })
        }
    }
}
