import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { NotificationDocument } from '../schemas/notification.schema'
import { Model } from 'mongoose'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'

@Injectable()
export class NotificationService {
    constructor(
        @InjectModel(Notification.name)
        private readonly notiModel: Model<NotificationDocument>,
        @InjectQueue('notifications') private readonly queue: Queue
    ) {}

    async getUserNotifications(userId: string) {
        return await this.notiModel.find({ userId }).sort({ createdAt: -1 }).exec()
    }

    async getUnreadNotifications(userId: string) {
        return await this.notiModel.find({ userId, seen: false }).sort({ createdAt: -1 }).exec()
    }

    async markRead(notificationId: string) {
        await this.queue.add('mark-read', { notificationId })
        return { success: true }
    }

    async markReadAll(userId: string) {
        await this.queue.add('mark-read-all', { userId })
        return { success: true }
    }
}
