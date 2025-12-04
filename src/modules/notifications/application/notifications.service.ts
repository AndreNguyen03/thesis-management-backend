import { Injectable, RequestTimeoutException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { NotificationsGateway } from '../gateways/notifications.gateway'
import { Notification } from '../schemas/notification.schemas'
import { CreateAndSend } from '../dto/create-and-send.dtos'

@Injectable()
export class NotificationsService {
    constructor(
        @InjectModel(Notification.name) private readonly notiModel: Model<Notification>,
        private notificationsGateway: NotificationsGateway
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

        this.notificationsGateway.sendToUser(
            createDto.recipientId,
            'new_notification', // Tên sự kiện client sẽ lắng nghe
            socketPayload
        )

        return newNoti
    }
}
