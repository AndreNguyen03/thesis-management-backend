import { InjectQueue } from '@nestjs/bull'
import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { Queue } from 'bull'
import { NotificationType } from '../schemas/notification.schemas'
import { CheckUserInfoProvider } from '../../../users/provider/check-user-info.provider'
import { NotificationTitleEnum } from '../enum/title.enum'
import { GetMiniTopicInfo } from '../../topics/dtos'
import { BodyReplyRegistrationDto } from '../../registrations/dtos/query-reply-registration.dto'
import { getRejectionReasonText } from '../../../common/utils/translate-code-to-semantic-text'
import { RejectionReasonType } from '../../registrations/schemas/ref_students_topics.schemas'
import { GetNotificationDto } from '../dtos/get-notifications'
import { RequestReminderLecturers } from '../dtos/request.dtos'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'
import { PeriodsService } from '../../periods/application/periods.service'
import { Phase1Response, Phase2Response, Phase3Response } from '../../periods/dtos/phase-resolve.dto'
import { FacultyService } from '../../faculties/application/faculty.service'
import { CreateNotification } from '../dtos/create-and-send.dtos'
import { NotificationsService } from '../application/notifications.service'
import { plainToInstance } from 'class-transformer'
import { GetFacultyDto } from '../../faculties/dtos/faculty.dtos'
import { User } from '../../../users/schemas/users.schema'
import { GetPeriodDto } from '../../periods/dtos/period.dtos'
import { transferNamePeriod } from '../../../common/utils/transfer-name-period'
import { PeriodType } from '../../periods/enums/periods.enum'
import { MailService } from '../../../mail/providers/mail.service'
import { UserService } from '../../../users/application/users.service'
import { SendCustomNotificationDto } from '../dtos/send-custom-notificaition.dtos'
import { RecipientType } from '../enum/recipient-type.enum'
import { UserRole } from '../../../auth/enum/user-role.enum'
import mongoose from 'mongoose'
import { RecipientMode, SendData } from '../../../mail/dtos/send-data.dtos'

@Injectable()
export class NotificationPublisherService {
    constructor(
        @InjectQueue('notifications')
        private readonly queue: Queue,
        @Inject(forwardRef(() => PeriodsService))
        private readonly periodsService: PeriodsService,
        private readonly facultyService: FacultyService,
        private readonly checkUserInfo: CheckUserInfoProvider,
        private readonly notificationsService: NotificationsService,
        @Inject(forwardRef(() => MailService))
        private readonly mailService: MailService,
        private readonly userService: UserService
    ) {}
    //Tạo và gửi thông báo cho một người dùng
    async createAndSendNoti(
        recipientId: string,
        title: string,
        message: string,
        type: NotificationType,
        senderId?: string,
        metadata?: Record<string, any>
    ) {
        // save to db
        const noti = await this.notificationsService.createNotification({
            recipientId,
            senderId,
            title,
            message,
            type,
            isRead: false,
            metadata
        })
        //  console.log('Created notification:', noti)
        // push job to queue để hiển thị lên tức thời
        await this.queue.add('send-personal-notification', noti as GetNotificationDto)
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

    //Khi giảng viên HD chính chấp nhận đăng ký của sinh viên
    async sendApprovedRegisterationNotification(recipientId: string, actorId: string, topicInfo: GetMiniTopicInfo) {
        const message = `Chúc mừng! Bạn đã trở thành thành viên chính thức của đề tài "${topicInfo.titleVN} (${topicInfo.titleEng})". Hãy bắt đầu hành trình nghiên cứu của bạn ngay hôm nay!`
        console.log(message)

        await this.createAndSendNoti(
            recipientId,
            NotificationTitleEnum.SUCCESS_REGISTRATION,
            message,
            NotificationType.SUCCESS,
            actorId,
            {
                topicId: topicInfo._id,
                titleVN: topicInfo.titleVN,
                titleEng: topicInfo.titleEng,
                actionUrl: `/detail-topic/${topicInfo._id}`
            }
        )
    }
    //Khi giảng viên HD chính từ chối đăng ký của sinh viên
    async sendRejectedRegisterationNotification(
        recipientId: string,
        lecturerInfo: User,
        topicInfo: GetMiniTopicInfo,
        body: BodyReplyRegistrationDto
    ) {
        const message = `Giảng viên ${lecturerInfo!.fullName} đã từ  chối yêu cầu tham gia đề tài "${topicInfo.titleVN}". Lý do chính: ${getRejectionReasonText(body.rejectionReasonType as RejectionReasonType)} `
        await this.createAndSendNoti(
            recipientId,
            NotificationTitleEnum.REJECTED_REGISTRATION,
            message,
            NotificationType.ERROR,
            lecturerInfo._id.toString(),
            //meta
            {
                topicId: topicInfo._id,
                titleVN: topicInfo.titleVN,
                titleEng: topicInfo.titleEng,
                message,
                reasonSub: body.lecturerResponse,
                rejectedBy: lecturerInfo!.fullName,
                actionUrl: `/detail-topic/${topicInfo._id}`
            }
        )
    }
    //Khi đề tài đã được BCN chấp thuận
    async sendApprovalTopicNotification(
        mainSupervisor: User | null,
        actorId: string,
        coSupervisors: User[] | null,
        topicInfo: GetMiniTopicInfo,
        facultyId: string
    ) {
        //Laasy faculty info
        const facultyInfo = await this.facultyService.getFacultyById(facultyId)
        const message = `Đề tài "${topicInfo.titleVN} (${topicInfo.titleEng})" của bạn đã được Ban chủ nhiệm khoa chấp thuận. `

        if (mainSupervisor) {
            await this.createAndSendNoti(
                mainSupervisor._id.toString(),
                NotificationTitleEnum.APPROVED_TOPIC,
                message,
                NotificationType.SUCCESS,
                actorId,
                {
                    topicId: topicInfo._id.toString(),
                    titleVN: topicInfo.titleVN,
                    titleEng: topicInfo.titleEng,
                    actionUrl: `/detail-topic/${topicInfo._id}`
                }
            )

            await this.mailService.sendApprovalTopicNotification(
                mainSupervisor,
                topicInfo,
                plainToInstance(GetFacultyDto, facultyInfo, {
                    excludeExtraneousValues: true,
                    enableImplicitConversion: true
                })
            )
        }

        const messageCoSupervisor = `Bạn đã được thêm làm Giảng viên đồng hướng dẫn cho đề tài ${topicInfo.titleVN} (${topicInfo.titleEng}). Hãy phối hợp cùng GVHD chính để hỗ trợ sinh viên tốt nhất nhé!`
        if (coSupervisors) {
            for (const coSupervisor of coSupervisors) {
                await this.createAndSendNoti(
                    coSupervisor._id.toString(),
                    NotificationTitleEnum.ASSIGNED_CO_SUPERVISOR,
                    messageCoSupervisor,
                    NotificationType.SYSTEM,
                    undefined,
                    {
                        topicId: topicInfo._id,
                        titleVN: topicInfo.titleVN,
                        titleEng: topicInfo.titleEng,
                        actionUrl: `/detail-topic/${topicInfo._id}`
                    }
                )
                await this.mailService.sendAssignedCoSupervisorNotification(
                    coSupervisor,
                    topicInfo,
                    plainToInstance(GetFacultyDto, facultyInfo, {
                        excludeExtraneousValues: true,
                        enableImplicitConversion: true
                    })
                )
            }
        }
    }
    //Khi đề tài đã được BCN từ chối
    async sendRejectedTopicNotification(recipientId: string, actorId: string, topicInfo: GetMiniTopicInfo) {
        const message = `Đề tài "${topicInfo.titleVN} (${topicInfo.titleEng})" của bạn đã bị Ban chủ nhiệm khoa từ chối.`
        await this.createAndSendNoti(
            recipientId,
            NotificationTitleEnum.REJECTED_TOPIC,
            message,
            NotificationType.ERROR,
            actorId,
            {
                topicId: topicInfo._id,
                titleVN: topicInfo.titleVN,
                titleEng: topicInfo.titleEng,
                reasonSub: 'Vui lòng liên hệ Ban Chủ nhiệm khoa để biết thêm chi tiết.',
                // chuyển hướng tới xem những đề tài đã nộp
                actionUrl: `/manage-topics/submitted`
            }
        )
    }
    //Khi đề tài BCn gửi nhắc nhở xử lý các tồn động
    //có socket
    async sendReminderLecturerInPeriod(body: RequestReminderLecturers, senderId: string) {
        const periodInfo = await this.periodsService.getPeriodById(body.periodId)
        const periodName = transferNamePeriod(periodInfo!)
        const { faculty: facultyInfo, ...nest } = periodInfo!

        //Lấy danh sách các giảng viên cùng thông tin
        let list
        if (body.phaseName === PeriodPhaseName.SUBMIT_TOPIC) {
            list = (await this.periodsService.closePhase(body.periodId, body.phaseName)) as Phase1Response
            // duyệt qua tất cả giảng viên để gửi thông báo
            console.log("rrrr", list)
            const { missingTopics: lecturers } = list
            for (const lecturer of lecturers) {
                console.log("sdsad",lecturer.userId)
                const newNotification: CreateNotification = {
                    recipientId: lecturer.userId,
                    senderId,
                    title: NotificationTitleEnum.REMINDER_SUBMIT_TOPIC,
                    message: `BCN khoa ${facultyInfo.name}: Bạn hiện tại mới nộp ${lecturer.submittedTopicsCount}/${lecturer.minTopicsRequired} đề tài yêu cầu. Vui lòng hoàn thành trước ${new Date(body.deadline).toLocaleString('vi-VN')}`,
                    type: NotificationType.WARNING,
                    isRead: false,
                    metadata: {
                        periodId: body.periodId,
                        periodName,
                        currentCount: lecturer.submittedTopicsCount,
                        requiredCount: lecturer.minTopicsRequired
                    }
                }
                //Lưu thông báo vào db
                const res = await this.notificationsService.createNotification(newNotification)
                const notiSend: GetNotificationDto = {
                    ...newNotification,
                    _id: res._id.toString(),
                    createdAt: new Date()
                }
                //Gửi thông báo qua socket
                await this.queue.add('send-notifications-inphase', {
                    senderId: lecturer.userId,
                    notiSend
                })
                //Gửi thông báo qua email
                //Lấy thông tin người gửi
                const checkUserInfo = await this.checkUserInfo.getUserInfo(lecturer.userId)
                const message = 'Kính mong quý thầy/cô sớm hoàn thành việc nộp đề tài'
                await this.mailService.sendReminderSubmitTopicMail(
                    checkUserInfo,
                    message,
                    body.deadline,
                    notiSend.metadata!,
                    plainToInstance(GetFacultyDto, facultyInfo, {
                        excludeExtraneousValues: true,
                        enableImplicitConversion: true
                    })
                )
            }
        } else if (body.phaseName === PeriodPhaseName.OPEN_REGISTRATION) {
            list = (await this.periodsService.closePhase(body.periodId, body.phaseName)) as Phase2Response
        } else if (body.phaseName === PeriodPhaseName.EXECUTION) {
            list = (await this.periodsService.closePhase(body.periodId, body.phaseName)) as Phase3Response
        }
        //ủa có pha nhắc nhở chưa nộp báo cáo cuối kì chưa vậy
    }

    //Gửi thông báo khi kỳ mở đăng ký bắt đầu
    //chưa có socket
    async sendPeriodOpenRegistrationNotification(senderId: string, periodInfo: GetPeriodDto) {
        //lấy thông tin user của toàn bộ user trong faculty
        const users = await this.userService.getUsersByFacultyId(periodInfo.faculty._id.toString())
        //1. Tạo thông báo chuẩn bị
        // Tìm phase mở đăng ký
        const openRegistrationPhase = periodInfo.phases?.find((p) => p.phase === PeriodPhaseName.OPEN_REGISTRATION)

        if (!openRegistrationPhase?.startTime) {
            throw new Error('Không tìm thấy thông tin phase mở đăng ký')
        }

        //2.Tạo thông báo bắt đầu với delay
        const now = new Date()
        const startDate = new Date(openRegistrationPhase.startTime)
        const delayMs = startDate.getTime() - now.getTime()

        //tạo id cho job và email
        const jobId = `open-registration-${periodInfo._id}`
        const emailJobId = `open-registration-email-${periodInfo._id}`
        const upcomingEmailJobId = `open-registration-upcoming-${periodInfo._id}`

        //hủy job trước đó nếu có
        await this.cancelScheduledJob(jobId)
        await this.cancelScheduledJob(upcomingEmailJobId)

        // Gửi email chuẩn bị ngay lập tức (không cần delay)
        if (delayMs > 0) {
            console.log(`📧 Gửi email chuẩn bị mở đăng ký ngay lập tức`)
            await this.mailService.sendUpcomingOpenRegistrationNotification(
                users,
                periodInfo,
                periodInfo.faculty,
                startDate,
                upcomingEmailJobId,
                0 // Gửi ngay, không delay
            )
        }

        // Gửi notification và email khi đến thời điểm mở đăng ký
        if (delayMs > 0) {
            console.log(`📢 Schedule thông báo mở đăng ký sau ${Math.floor(delayMs / 1000 / 60)} phút`)
            await this.queue.add(
                'send-open-registration-period',
                { users, senderId, periodInfo },
                {
                    jobId,
                    delay: delayMs,
                    attempts: 3,
                    removeOnComplete: true,
                    removeOnFail: false
                }
            )
            await this.mailService.sendPeriodOpenRegistrationNotification(
                users,
                periodInfo,
                periodInfo.faculty,
                emailJobId,
                delayMs
            )
            //console.log(`✅ Đã schedule ${users.length} emails mở đăng ký`)
        } else {
            //gửi ngay
            console.log('⚡ Gửi thông báo mở đăng ký ngay lập tức')
            await this.queue.add('send-open-registration-period', { users, senderId, periodInfo })
            await this.mailService.sendPeriodOpenRegistrationNotification(
                users,
                periodInfo,
                periodInfo.faculty,
                emailJobId
            )
            //console.log(`✅ Đã gửi cho ${users.length} users`)
        }
    }
    //Gửi thông báo khi kỳ học bắt đầu
    async sendNewSemesticNotification(senderId: string, periodInfo: GetPeriodDto) {
        //lấy thông tin user của toàn bộ user trong faculty
        const users = await this.userService.getUsersByFacultyId(periodInfo.faculty._id.toString())

        // Sử dụng startDate của period thay vì openRegistrationPhase
        if (!periodInfo.startTime) {
            throw new Error('Không tìm thấy thông tin ngày bắt đầu kỳ học')
        }

        const now = new Date()
        const startDate = new Date(periodInfo.startTime)
        const delayMs = startDate.getTime() - now.getTime()

        //tạo id cho job và email
        const jobId = `new-semester-${periodInfo._id}`
        const emailJobId = `new-semester-email-${periodInfo._id}`
        const upcomingEmailJobId = `new-semester-upcoming-${periodInfo._id}`

        //hủy job trước đó nếu có
        await this.cancelScheduledJob(jobId)
        await this.cancelScheduledJob(upcomingEmailJobId)

        // Gửi email chuẩn bị ngay lập tức (không cần delay)
        if (delayMs > 0) {
            console.log(`📧 Gửi email chuẩn bị học kỳ mới ngay lập tức`)
            await this.mailService.sendUpcomingNewSemesterNotification(
                users,
                periodInfo,
                periodInfo.faculty,
                startDate,
                upcomingEmailJobId,
                0 // Gửi ngay, không delay
            )
        }
        // Gửi notification và email khi đến thời điểm bắt đầu kỳ học
        if (delayMs > 0) {
            console.log(`📢 Schedule thông báo học kỳ mới sau ${Math.floor(delayMs / 1000 / 60)} phút`)
            await this.queue.add(
                'send-new-semestic-period',
                { users, senderId, periodInfo },
                {
                    jobId,
                    delay: delayMs,
                    attempts: 3
                }
            )
            await this.mailService.sendNewSemesticOpenGeneralNotification(
                users,
                periodInfo,
                periodInfo.faculty,
                emailJobId,
                delayMs
            )
            return `Đã lên lịch gửi ${users.length} emails cho gv sinh viên vào ${startDate.toLocaleString('vi-VN')}`
        } else {
            console.log('⚡ Gửi thông báo học kỳ mới ngay lập tức')
            await this.queue.add('send-new-semestic-period', { users, senderId, periodInfo })
            await this.mailService.sendNewSemesticOpenGeneralNotification(
                users,
                periodInfo,
                periodInfo.faculty,
                emailJobId
            )
            return `✅ Đã gửi cho ${users.length} users`
        }
    }

    //helper hủy job đã lên lịch
    private async cancelScheduledJob(jobId: string) {
        try {
            const job = await this.queue.getJob(jobId)
            if (job) {
                const state = await job.getState()
                // Chỉ hủy nếu job đang delayed hoặc waiting
                if (state === 'delayed' || state === 'waiting') {
                    await job.remove()
                    console.log(`🗑️ Đã hủy job cũ: ${jobId}`)
                }
            }
        } catch (error) {
            console.log(`ℹ️ Không tìm thấy job cũ: ${jobId}`)
        }
    }

    //Gửi thông báo cho các giảng viên được yêu cầu nộp đề tài trong kì
    async sendPhaseSubmitTopicNotification(userIds: string[], periodId: string, deadline: Date): Promise<void> {
        const users = await this.userService.getUsersByUserIds(userIds)
        const periodInfo = await this.periodsService.getPeriodById(periodId)
        console.log('Gửi thông báo nộp đề tài cho các giảng viên:', userIds)
        const payload = {
            users,
            periodInfo,
            periodName: transferNamePeriod(periodInfo),
            deadline: deadline.toISOString()
        }

        await this.queue.add('submit-topic-request', payload, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000
            }
        })
        await this.mailService.sendSubmitTopicRequestEmail({
            users,
            periodName: transferNamePeriod(periodInfo),
            deadline: deadline.toISOString(),
            periodId: periodInfo._id.toString()
        })
    }
    async sendCustomNotification(
        senderId: string,
        facultyId: string,
        dto: SendCustomNotificationDto
    ): Promise<{ sentCount: number }> {
        // 1. Validate period thuộc faculty
        const period = await this.periodsService.checkCurrentPeriod(dto.periodId)

        if (!period) {
            throw new NotFoundException('Không tìm thấy đợt đăng ký')
        }

        // 2. Lấy danh sách người nhận
        let recipientIds: string[] = []

        if (dto.recipientType === RecipientMode.ALL_INSTRUCTORS) {
            //lấy tất cả các lecturers trong faculty
            const lecturers = await this.userService.getUsersByFacultyId(facultyId, UserRole.LECTURER)
            recipientIds = lecturers.map((l) => l._id.toString())
        } else if (dto.recipientType === RecipientMode.ALL_STUDENTS) {
            // Lấy tất cả sinh viên có đề tài trong period này
            const students = await this.userService.getUsersByFacultyId(facultyId, UserRole.STUDENT)
            recipientIds = students.map((s) => s._id.toString())
        } else if (dto.recipientIds && dto.recipientIds.length > 0) {
            recipientIds = dto.recipientIds
        }

        if (recipientIds.length === 0) {
            throw new BadRequestException('Không có người nhận nào được chọn')
        }

        //3. Gửi thông báo qua queue
        await this.queue.add('send-custom-noti', { subject: dto.subject, content: dto.content, senderId, recipientIds })

        // 4. Gửi email (nếu có service email)
        const mailData = {
            recipientMode: dto.recipientType as RecipientMode,
            recipients: recipientIds,
            subject: dto.subject,
            content: dto.content
        } as SendData
        await this.mailService.sendCustomEmail(dto.periodId, mailData)
        return { sentCount: recipientIds.length }
    }
}
