import { Injectable } from '@nestjs/common'
import { NotificationPublisherService } from '../publisher/notification.publisher.service'
import { NotificationTitleEnum } from '../enum/title.enum'
import { NotificationType } from '../schemas/notification.schemas'
import { GetMiniTopicInfo } from '../../topics/dtos'
import { CheckUserInfoProvider } from '../../../users/provider/check-user-info.provider'
import { getRejectionReasonText } from '../../../common/utils/translate-code-to-semantic-text'
import { BodyReplyRegistrationDto } from '../../registrations/dtos/query-reply-registration.dto'
import { RejectionReasonType } from '../../registrations/schemas/ref_students_topics.schemas'

@Injectable()
export class PersonalNotificationProvider {
    constructor(
        private readonly notificationPublisherService: NotificationPublisherService,
        private readonly checkUserInfoProvider: CheckUserInfoProvider
    ) {}
    async sendApprovedRegisterationNotification(recipientId: string, actorId: string, topicInfo: GetMiniTopicInfo) {
        const message = `Chúc mừng! Bạn đã trở thành thành viên chính thức của đề tài "${topicInfo.titleVN} (${topicInfo.titleEng})". Hãy bắt đầu hành trình nghiên cứu của bạn ngay hôm nay!`
        console.log(message)
        await this.notificationPublisherService.createAndSendNoti(
            recipientId,
            actorId,
            NotificationTitleEnum.SUCCESS_REGISTRATION,
            message,
            NotificationType.SUCCESS,
            {
                topicId: topicInfo._id,
                titleVN: topicInfo.titleVN,
                titleEng: topicInfo.titleEng
            },
            false
        )
    }
    async sendRejectedRegisterationNotification(
        recipientId: string,
        actorId: string,
        topicInfo: GetMiniTopicInfo,
        body: BodyReplyRegistrationDto
    ) {
        const lecturerInfo = await this.checkUserInfoProvider.getUserInfo(actorId)
        const message = `Giảng viên ${lecturerInfo!.fullName} đã từ từ chối yêu cầu tham gia đề tài ${topicInfo.titleVN}. Lý do: ${getRejectionReasonText(body.rejectionReasonType as RejectionReasonType)} - ${body.lecturerResponse}`
        await this.notificationPublisherService.createAndSendNoti(
            recipientId,
            actorId,
            NotificationTitleEnum.REJECTED_REGISTRATION,
            message,
            NotificationType.ERROR,
            //meta
            {
                topicId: topicInfo._id,
                titleVN: topicInfo.titleVN,
                titleEng: topicInfo.titleEng,
                rejectedBy: lecturerInfo!.fullName
            },
            false
        )
    }
    async sendApprovalTopicNotification(recipientId: string, actorId: string, topicInfo: GetMiniTopicInfo) {
        const message = `Đề tài "${topicInfo.titleVN} (${topicInfo.titleEng})" của bạn đã được Ban chủ nhiệm khoa chấp thuận. `
        await this.notificationPublisherService.createAndSendNoti(
            recipientId,
            actorId,
            NotificationTitleEnum.APPROVED_TOPIC,
            message,
            NotificationType.SUCCESS,
            {
                topicId: topicInfo._id,
                titleVN: topicInfo.titleVN,
                titleEng: topicInfo.titleEng
            },
            false
        )
    }
    async sendRejectedTopicNotification(recipientId: string, actorId: string, topicInfo: GetMiniTopicInfo) {
        const message = `Đề tài "${topicInfo.titleVN} (${topicInfo.titleEng})" của bạn đã bị Ban chủ nhiệm khoa từ chối.`
        await this.notificationPublisherService.createAndSendNoti(
            recipientId,
            actorId,
            NotificationTitleEnum.REJECTED_TOPIC,
            message,
            NotificationType.ERROR,
            {
                topicId: topicInfo._id,
                titleVN: topicInfo.titleVN,
                titleEng: topicInfo.titleEng
            },
            false
        )
    }
}
