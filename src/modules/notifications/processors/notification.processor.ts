import { Process, Processor } from '@nestjs/bull'
import { OnlineUserService } from '../application/online-user.service'
import { Job } from 'bull'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model } from 'mongoose'
import { Inject, NotFoundException } from '@nestjs/common'
import { MailService } from '../../../mail/providers/mail.service'
import { UserService } from '../../../users/application/users.service'
import { NotificationsGateway } from '../gateways/notifications.gateway'
import { Notification, NotificationType } from '../schemas/notification.schemas'
import { MissingTopicRecord } from '../../periods/dtos/phase-resolve.dto'
import { GetNotificationDto } from '../dtos/get-notifications'
import { CheckUserInfoProvider } from '../../../users/provider/check-user-info.provider'
import { NotificationTitleEnum } from '../enum/title.enum'
import { User } from '../../../users/schemas/users.schema'
import { GetFacultyDto } from '../../faculties/dtos/faculty.dtos'
import { OpenPeriodNotificationTypeEnum } from '../enum/open-period.enum'
import { GetMiniTopicInfo } from '../../topics/dtos'
import { LecturerRoleEnum } from '../../registrations/enum/lecturer-role.enum'
import { SendApprovalEmail } from '../dtos/processor-job.dtos'
import { GetPeriodDto } from '../../periods/dtos/period.dtos'
import { NotificationsService } from '../application/notifications.service'
import { transferNamePeriod } from '../../../common/utils/transfer-name-period'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'
import { LecturerRepositoryInterface } from '../../../users/repository/lecturer.repository.interface'

@Processor('notifications')
export class NotificationQueueProcessor {
    constructor(
        private readonly notiGateway: NotificationsGateway,
        private readonly onlineUserService: OnlineUserService,
        private readonly mailService: MailService,
        @InjectModel(Notification.name)
        private readonly notiModel: Model<Notification>,
        private readonly notificationsService: NotificationsService
    ) {}
    //Gửi thông báo mới nhất riêng cho một user, trên nhiều thiết bị
    @Process('send-personal-notification')
    async handleSendNotification(job: Job) {
        const { _id, recipientId, title, message, createdAt, type, isRead, metadata } = job.data
        const isOnline = await this.onlineUserService.isUserOnline(recipientId)
        console.log(`Is user ${recipientId} online?`, isOnline)
        if (isOnline) {
            this.notiGateway.server
                .to('user_' + recipientId)
                .emit('notification:new', { _id, title, message, createdAt, type, isRead, metaData: metadata })
            console.log(`Notification sent to user ${recipientId} via WebSocket.`)
        }
        //code cũ không cần thiết vì cứ một trình duyệt mở socket là được đnagư ký trong roome user_{userId} rùi
        //không cần thiết phải gửi từng socket của user nữa => mất đi tính tiện lợi của chức năng tạo room của socket
    }

    @Process('send-open-registration-period')
    async handleSendOpenRegistrationPeriod(job: Job<{ users: User[]; senderId: string; periodInfo: GetPeriodDto }>) {
        const { users, senderId, periodInfo } = job.data
        const message = `Hệ thống đã mở đợt đăng ký đề tài cho {semestic} năm học {year}.`
        try {
            for (const user of users) {
                await this.notificationsService.createNotification({
                    recipientId: user._id.toString(),
                    senderId: senderId,
                    title: NotificationTitleEnum.OPEN_REGISTRATION_PERIOD,
                    message,
                    type: NotificationType.SYSTEM,
                    isRead: false,
                    metadata: {
                        periodId: periodInfo._id,
                        periodName: transferNamePeriod(periodInfo),
                        phaseName: PeriodPhaseName.OPEN_REGISTRATION
                    }
                })
            }
        } catch (error) {
            console.error('Error sending open registration period notifications:', error)
        }
        await this.notiGateway.server.to(`faculty_${periodInfo.faculty._id}`).emit('notification:new', {
            _id: new mongoose.Types.ObjectId(),
            title: NotificationTitleEnum.OPEN_REGISTRATION_PERIOD,
            message,
            createdAt: new Date(),
            type: NotificationType.SYSTEM,
            isRead: false,
            metaData: {
                periodId: periodInfo._id,
                periodName: transferNamePeriod(periodInfo),
                phaseName: PeriodPhaseName.OPEN_REGISTRATION
            }
        })
    }
    @Process('send-new-semestic-period')
    async handleSendNewSemesticPeriod(job: Job<{ users: User[]; senderId: string; periodInfo: GetPeriodDto }>) {
        const { users, senderId, periodInfo } = job.data
        const message = `Học kỳ mới - ${periodInfo.semester} năm học ${periodInfo.year} đã bắt đầu. Chúc mọi điều may mắn`
        try {
            for (const user of users) {
                await this.notificationsService.createNotification({
                    recipientId: user._id.toString(),
                    senderId: senderId,
                    title: NotificationTitleEnum.OPEN_GENERAL_PERIOD,
                    message,
                    type: NotificationType.SYSTEM,
                    isRead: false,
                    metadata: {
                        periodId: periodInfo._id,
                        periodName: transferNamePeriod(periodInfo),
                        phaseName: PeriodPhaseName.OPEN_REGISTRATION
                    }
                })
            }
        } catch (error) {
            console.error('Error sending open registration period notifications:', error)
        }
        await this.notiGateway.server.to(`faculty_${periodInfo.faculty._id}`).emit('notification:new', {
            _id: new mongoose.Types.ObjectId(),
            title: NotificationTitleEnum.OPEN_GENERAL_PERIOD,
            message,
            createdAt: new Date(),
            type: NotificationType.SYSTEM,
            isRead: false,
            metaData: {
                periodId: periodInfo._id,
                periodName: transferNamePeriod(periodInfo),
                phaseName: PeriodPhaseName.OPEN_REGISTRATION
            }
        })
    }
    @Process('send-notifications-inphase')
    async handleSendRemindersSubmitPhase(job: Job<{ senderId: string; notiSend: GetNotificationDto }>) {
        const { senderId, notiSend } = job.data
        //Gửi thông báo qua socket
        const isOnline = await this.onlineUserService.isUserOnline(senderId)
        if (isOnline) {
            this.notiGateway.server.to('user_' + senderId).emit('notification', notiSend)
        }
    }
    //code cũ không cần thiết vì cứ một trình duyệt mở socket là được đnagư ký trong roome user_{userId} rùi
    //không cần thiết phải gửi từng socket của user nữa => mất đi tính tiện lợi của chức năng tạo room của socket

    @Process('mark-read-all')
    async handleMarkReadAll(job: Job<{ userId: string }>) {
        const { userId } = job.data
        // update db
        await this.notiModel.updateMany(
            { recipientId: new mongoose.Types.ObjectId(userId), isRead: false },
            { isRead: true }
        )
        const isOnline = await this.onlineUserService.isUserOnline(userId)
        if (isOnline) {
            this.notiGateway.server.to('user_' + userId).emit('notification:mark-read-all')
        }
    }

    @Process('mark-read')
    async handleMarkRead(job: Job<{ notificationId: string }>) {
        const { notificationId } = job.data

        const noti = await this.notiModel.findByIdAndUpdate({ _id: notificationId }, { isRead: true })

        if (!noti) throw new NotFoundException('Notification not found')
        // console.log('Emitting mark-read for notification:', noti)
        this.notiGateway.server
            .to('user_' + noti.recipientId.toString())
            .emit('notification:marked-read', notificationId)
    }

    @Process('submit-topic-request')
    async handleSubmitTopicRequest(
        job: Job<{ users: User[]; periodInfo: GetPeriodDto; periodName: string; deadline: string }>
    ) {
        const { users, periodInfo, periodName, deadline } = job.data
        const message = `Bạn được yêu cầu nộp đề tài trong kì ${periodName} trước ngày ${new Date(deadline).toLocaleString()}. Vui lòng đăng nhập hệ thống để nộp đề tài.`

        try {
            for (const user of users) {
                await this.notificationsService.createNotification({
                    recipientId: user._id.toString(),
                    senderId: undefined,
                    title: NotificationTitleEnum.REQUEST_SUBMIT_TOPIC,
                    message,
                    type: NotificationType.SYSTEM,
                    isRead: false,
                    metadata: {
                        periodId: periodInfo._id,
                        periodName: transferNamePeriod(periodInfo),
                        phaseName: PeriodPhaseName.OPEN_REGISTRATION
                    }
                })
                await this.notiGateway.server.to(`user_${user._id.toString()}`).emit('notification:new', {
                    _id: new mongoose.Types.ObjectId(),
                    title: NotificationTitleEnum.REQUEST_SUBMIT_TOPIC,
                    message,
                    createdAt: new Date(),
                    type: NotificationType.SYSTEM,
                    isRead: false,
                    metaData: {
                        periodId: periodInfo._id,
                        periodName: transferNamePeriod(periodInfo),
                        phaseName: PeriodPhaseName.OPEN_REGISTRATION
                    }
                })
            }

            // Gửi email cho tất cả users
            await this.mailService.sendSubmitTopicRequestEmail({
                users,
                periodName,
                deadline: deadline,
                periodId: periodInfo._id.toString()
            })
        } catch (error) {
            console.error('Error sending open registration period notifications:', error)
        }
    }
}
