import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model } from 'mongoose'
import { Notification } from '../schemas/notification.schemas'
import { CreateNotification } from '../dtos/create-and-send.dtos'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { PaginationProvider } from '../../../common/pagination-an/providers/pagination.provider'

@Injectable()
export class NotificationsService {
    constructor(
        @InjectModel(Notification.name) private readonly notiModel: Model<Notification>,
        @InjectQueue('notifications') private readonly queue: Queue,
        private readonly paginationProvider: PaginationProvider
    ) {}

    async getUserNotifications(userId: string, query: PaginationQueryDto) {
        const pipelineSub: any[] = []
        pipelineSub.push(
            { $match: { recipientId: new mongoose.Types.ObjectId(userId), deleted_at: null } },
            { $sort: { createdAt: -1 } }
        )
        return await this.paginationProvider.paginateQuery<Notification>(query, this.notiModel, pipelineSub)
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
    async createNotification(createDto: CreateNotification) {
        let res
        try {
            res = (await this.notiModel.create(createDto)).toObject()
        } catch (error) {
            throw new BadRequestException('Không thể tạo thông báo')
        }
        return res
    }
}
