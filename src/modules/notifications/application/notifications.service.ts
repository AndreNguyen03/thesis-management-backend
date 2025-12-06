import { Injectable, RequestTimeoutException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model } from 'mongoose'
import { NotificationsGateway } from '../gateways/notifications.gateway'
import { Notification } from '../schemas/notification.schemas'
import { CreateAndSend } from '../dto/create-and-send.dtos'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { CheckUserInfoProvider } from '../../../users/provider/check-user-info.provider'

@Injectable()
export class NotificationsService {
    constructor(
        @InjectModel(Notification.name) private readonly notiModel: Model<Notification>,
        private notificationsGateway: NotificationsGateway,
        @InjectQueue('notifications') private readonly queue: Queue
    ) {}
    async createAndSend(actorId: string, createDto: CreateAndSend) {
        // 1. Persistence: Lưu vào DB trước (Source of Truth)
        let newNoti
        try {
            newNoti = await this.notiModel.create({
                ...createDto,
                actorId: actorId,
                readAt: null
            })
        } catch (error) {
            throw new RequestTimeoutException('Failed to create notification')
        }

        // 2. Real-time: Bắn socket sau
        // Chỉ gửi những data cần thiết để hiển thị Toast/Popup
        const socketPayload = {
            id: newNoti._id,
            content: newNoti.content,
            type: newNoti.type,
            createdAt: newNoti['createdAt']
        }

     

        return newNoti
    }
    async getUserNotifications(userId: string) {
        return await this.notiModel
            .find({ recipientId: new mongoose.Types.ObjectId(userId), deleted_at: null })
            .sort({ createdAt: -1 })
            .exec()
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
