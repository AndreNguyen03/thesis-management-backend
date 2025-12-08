import { Process, Processor } from '@nestjs/bull'
import { OnlineUserService } from '../application/online-user.service'
import { Job } from 'bull'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model } from 'mongoose'
import { NotFoundException } from '@nestjs/common'
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
                .emit('notification:new', { _id, title, message, createdAt, type, isRead, metaData: metadata })
            console.log(`Notification sent to user ${recipientId} via WebSocket.`)
        }
        //code cũ không cần thiết vì cứ một trình duyệt mở socket là được đnagư ký trong roome user_{userId} rùi
        //không cần thiết phải gửi từng socket của user nữa => mất đi tính tiện lợi của chức năng tạo room của socket
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
        // emit ws to all user socket (if user has more than 1 device access to app)
        // const sockets = await this.onlineUserService.getSockets(userId)
        // sockets.forEach((sid) => {

        //   })
    }

    @Process('mark-read')
    async handleMarkRead(job: Job<{ notificationId: string }>) {
        const { notificationId } = job.data

        const noti = await this.notiModel.findByIdAndUpdate({ _id: notificationId }, { isRead: true })

        if (!noti) throw new NotFoundException('Notification not found')
       // console.log('Emitting mark-read for notification:', noti)
        this.notiGateway.server
            .to('user_' + noti.recipientId.toString())
            .emit('notification:marked-read', notificationId )
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

    @Process('send-email-reminders')
    async handleSendReminderEmail(
        job: Job<{ user: User; message: string; deadline: Date; metadata: Record<string, any>; faculty: GetFacultyDto }>
    ) {
        const { user, message, deadline, metadata, faculty } = job.data
        await this.mailService.sendReminderSubmitTopicMail(user!, message, deadline, metadata, faculty)
    }
    @Process('send-email-approval-topic-notification')
    async handleSendApprovalEmail(job: Job<SendApprovalEmail>) {
        const { user, topicInfo, faculty, type } = job.data
        if (type === LecturerRoleEnum.MAIN_SUPERVISOR)
            await this.mailService.sendApprovalTopicNotification(user!, topicInfo, faculty)
        else if (type === LecturerRoleEnum.CO_SUPERVISOR)
            await this.mailService.sendAssignedCoSupervisorNotification(user!, topicInfo, faculty)
    }

    @Process('send-email-open-period')
    async handleSendOpenPeriodEmail(
        job: Job<{ user: User; periodInfo: GetPeriodDto; faculty: GetFacultyDto; type: string }>
    ) {
        const { user, periodInfo, faculty } = job.data
        if (job.data.type === OpenPeriodNotificationTypeEnum.OPEN_REGISTRATION)
            await this.mailService.sendPeriodOpenRegistrationNotification(user!, periodInfo, faculty)
        else if (job.data.type === OpenPeriodNotificationTypeEnum.NEW_SEMESTER)
            await this.mailService.sendNewSemesticOpenGeneralNotification(user!, periodInfo, faculty)
    }
}
