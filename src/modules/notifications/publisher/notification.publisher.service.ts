import { InjectQueue } from '@nestjs/bull'
import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Queue } from 'bull'
import { Model } from 'mongoose'
import { Notification, NotificationType } from '../schemas/notification.schemas'
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
import { OpenPeriodNotificationTypeEnum } from '../enum/open-period.enum'
import { el } from '@faker-js/faker/.'
import { SendApprovalEmail } from '../dtos/processor-job.dtos'
import { User } from '../../../users/schemas/users.schema'
import { LecturerRoleEnum } from '../../registrations/enum/lecturer-role.enum'
import { ConfigService } from '@nestjs/config'
import { GetPeriodDto } from '../../periods/dtos/period.dtos'
import { transferNamePeriod } from '../../../common/utils/transfer-name-period'
@Injectable()
export class NotificationPublisherService {
    constructor(
        @InjectQueue('notifications')
        private readonly queue: Queue,
        private readonly checkUserInfoProvider: CheckUserInfoProvider,
        private readonly periodsService: PeriodsService,
        private readonly facultyService: FacultyService,
        private readonly checkUserInfo: CheckUserInfoProvider,
        private readonly notificationsService: NotificationsService
    ) {}
    //Tạo và gửi thông báo cho một người dùng
    async createAndSendNoti(
        recipientId: string,
        title: string,
        message: string,
        type: NotificationType,
        senderId?: string,
        metadata?: Record<string, any>,
        isSendMail?: boolean,
        contentEmail?: string
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
        console.log('Created notification:', noti)
        // push job to queue để hiển thị lên tức thời
        await this.queue.add('send-notification', noti as GetNotificationDto)
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
            },
            false
        )
    }
    //Khi giảng viên HD chính từ chối đăng ký của sinh viên
    async sendRejectedRegisterationNotification(
        recipientId: string,
        actorId: string,
        topicInfo: GetMiniTopicInfo,
        body: BodyReplyRegistrationDto
    ) {
        const lecturerInfo = await this.checkUserInfoProvider.getUserInfo(actorId)
        const message = `Giảng viên ${lecturerInfo!.fullName} đã từ từ chối yêu cầu tham gia đề tài ${topicInfo.titleVN}. Lý do: ${getRejectionReasonText(body.rejectionReasonType as RejectionReasonType)} - ${body.lecturerResponse}`
        await this.createAndSendNoti(
            recipientId,
            NotificationTitleEnum.REJECTED_REGISTRATION,
            message,
            NotificationType.ERROR,
            actorId,
            //meta
            {
                topicId: topicInfo._id,
                titleVN: topicInfo.titleVN,
                titleEng: topicInfo.titleEng,
                rejectedBy: lecturerInfo!.fullName,
                actionUrl: `/detail-topic/${topicInfo._id}`
            },
            false
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
                },
                false
            )
            await this.queue.add('send-email-approval-topic-notification', {
                user: mainSupervisor,
                topicInfo,
                faculty: plainToInstance(GetFacultyDto, facultyInfo, {
                    excludeExtraneousValues: true,
                    enableImplicitConversion: true
                }),
                type: LecturerRoleEnum.MAIN_SUPERVISOR
            } as SendApprovalEmail)
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
                await this.queue.add('send-email-approval-topic-notification', {
                    user: coSupervisor,
                    topicInfo,
                    faculty: plainToInstance(GetFacultyDto, facultyInfo, {
                        excludeExtraneousValues: true,
                        enableImplicitConversion: true
                    }),
                    type: LecturerRoleEnum.CO_SUPERVISOR
                } as SendApprovalEmail)
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
                // chuyển hướng tới xem những đề tài đã nộp
                actionUrl: `/manage-topics/submitted`
            },
            false
        )
    }
    //Khi đề tài BCn gửi nhắc nhở xử lý các tồn động
    async sendReminderLecturerInPeriod(body: RequestReminderLecturers, senderId: string) {
        const periodInfo = await this.periodsService.getCurrentPeriodInfo(body.periodId)
        const periodName = transferNamePeriod(periodInfo!)
        const { faculty: facultyInfo, ...nest } = periodInfo!

        console.log('Faculty info:', facultyInfo)
        //Lấy danh sách các giảng viên cùng thông tin
        let list
        if (body.phaseName === PeriodPhaseName.SUBMIT_TOPIC) {
            list = (await this.periodsService.closePhase(body.periodId, body.phaseName)) as Phase1Response
            // duyệt qua tất cả giảng viên để gửi thông báo
            const { missingTopics: lecturers } = list
            for (const lecturer of lecturers) {
                const newNotification: CreateNotification = {
                    recipientId: lecturer.lecturerId,
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
                    senderId: lecturer.lecturerId,
                    notiSend
                })
                //Gửi thông báo qua email
                //Lấy thông tin người gửi
                const checkUserInfo = await this.checkUserInfo.getUserInfo(lecturer.lecturerId)
                const message = 'Kính mong quý thầy/cô sớm hoàn thành việc nộp đề tài'
                await this.queue.add('send-email-reminders', {
                    user: checkUserInfo,
                    message,
                    metadata: notiSend.metadata,
                    deadline: body.deadline,
                    faculty: plainToInstance(GetFacultyDto, facultyInfo, {
                        excludeExtraneousValues: true,
                        enableImplicitConversion: true
                    })
                })
            }
        } else if (body.phaseName === PeriodPhaseName.OPEN_REGISTRATION) {
            list = (await this.periodsService.closePhase(body.periodId, body.phaseName)) as Phase2Response
        } else if (body.phaseName === PeriodPhaseName.EXECUTION) {
            list = (await this.periodsService.closePhase(body.periodId, body.phaseName)) as Phase3Response
        }
        //ủa có pha nhắc nhở chưa nộp báo cáo cuối kì chưa vậy
    }

    //Gửi thông báo khi kỳ mở đăng ký bắt đầu
    async sendPeriodOpenRegistrationNotification(recipientId: string, periodInfo: GetPeriodDto) {
        const message = `Hệ thống đã mở đợt đăng ký đề tài cho {semestic} năm học {year}.`
        await this.createAndSendNoti(
            recipientId,
            NotificationTitleEnum.OPEN_REGISTRATION_PERIOD,
            message,
            NotificationType.SYSTEM,
            undefined,
            {
                periodId: periodInfo._id,
                periodName: transferNamePeriod(periodInfo),
                phaseName: PeriodPhaseName.OPEN_REGISTRATION
            },
            false
        )
        //Chưa gửi email
    }
    //Gửi thông báo khi kỳ bắt đầu
    async sendNewSemesticOpenGeneralNotification(recipientId: string, periodInfo: GetPeriodDto) {
        const message = `Học kỳ mới - {semestic} năm học {year} đã bắt đầu. Chúc bạn một học kỳ thành công và nhiều trải nghiệm thú vị!`
        await this.createAndSendNoti(
            recipientId,
            NotificationTitleEnum.OPEN_GENERAL_PERIOD,
            message,
            NotificationType.SYSTEM,
            undefined,
            {
                periodId: periodInfo._id,
                periodName: transferNamePeriod(periodInfo)
            },
            false
        )
        //Chưa gửi email
    }
    private sendEmailOpenNewPeriod(type: OpenPeriodNotificationTypeEnum) {
        if (type === OpenPeriodNotificationTypeEnum.OPEN_REGISTRATION) {
            //comming soon
        } else if (type === OpenPeriodNotificationTypeEnum.NEW_SEMESTER) {
            //gửi email chào mừng kỳ mới
        }
    }
}
