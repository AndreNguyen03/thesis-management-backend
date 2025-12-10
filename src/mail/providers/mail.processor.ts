import { MailerService } from '@nestjs-modules/mailer'
import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bullmq'
import { GetPeriodDto } from '../../modules/periods/dtos/period.dtos'
import { ConfigService } from '@nestjs/config'
import { User } from '../../users/schemas/users.schema'
import { GetMiniTopicInfo } from '../../modules/topics/dtos'
import { GetFacultyDto } from '../../modules/faculties/dtos/faculty.dtos'

@Processor('mail-queue')
export class MailProcessor {
    constructor(
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService
    ) {}

    @Process('send-user-welcome')
    async handleSendUserWelcome(job: Job<{ user: User }>) {
        try {
            const { user } = job.data
            await this.mailerService.sendMail({
                to: user.email,
                from: `UIT Thesis <${this.configService.get('appConfig.smtpUsername')}>`,
                subject: 'Welcome to UIT Thesis System',
                template: 'welcome',
                context: {
                    lecturerName: user.fullName,
                    email: user.email,
                    loginUrl: this.configService.get('appConfig.clientUrl')
                }
            })
        } catch (e) {
            console.error('Gửi mail welcome thất bại:', e)
        }
    }

    @Process('send-reset-password')
    async handleSendResetPassword(job: Job<{ user: User; token: string }>) {
        try {
            const { user, token } = job.data
            const clientUrl = this.configService.get<string>('appConfig.clientUrl')
            const resetUrl = `${clientUrl}/reset-password?token=${token}`

            await this.mailerService.sendMail({
                to: user.email,
                from: `UIT Thesis <${this.configService.get('appConfig.smtpUsername')}>`,
                subject: 'Password Reset Request',
                template: 'reset-password',
                context: {
                    name: user.fullName,
                    email: user.email,
                    resetUrl
                }
            })
        } catch (e) {
            console.error('Gửi mail reset password thất bại:', e)
        }
    }

    @Process('send-notification')
    async handleSendNotification(job: Job<{ user: User; subject: string; content: string }>) {
        try {
            const { user, subject, content } = job.data
            await this.mailerService.sendMail({
                to: user.email,
                from: `UIT Thesis <${this.configService.get('appConfig.smtpUsername')}>`,
                subject,
                text: content
            })
        } catch (e) {
            console.error('Gửi mail notification thất bại:', e)
        }
    }

    @Process('send-reminder-submit-topic')
    async handleSendReminderSubmitTopic(
        job: Job<{ user: User; message: string; deadline: Date; metadata: Record<string, any>; faculty: GetFacultyDto }>
    ) {
        try {
            const { user, message, deadline, metadata, faculty } = job.data
            const frontendUrl = this.configService.get('appConfig.frontendUrl')
            const senderName = `Ban Chủ Nhiệm Khoa ${faculty.name}`

            await this.mailerService.sendMail({
                to: user.email,
                from: senderName,
                replyTo: faculty.email,
                template: './reminder-lecturer-topic',
                subject: 'Nhắc nhở nộp đề tài',
                text: message,
                context: {
                    lecturerName: user.fullName,
                    periodName: metadata.periodName,
                    deadline: new Date(deadline).toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    }),
                    currentCount: metadata.currentCount || 0,
                    requiredCount: metadata.requiredCount || 0,
                    link: `${frontendUrl}/lecturer/topics-management`,
                    facultyName: faculty.name,
                    facultyEmail: faculty.email,
                    facultyWebsite: faculty.urlDirection,
                    senderName: senderName
                }
            })
        } catch (e) {
            console.error('Gửi mail reminder thất bại:', e)
        }
    }

    @Process('send-period-open-registration')
    async handleSendPeriodOpenRegistration(job: Job<{ user: User; periodInfo: GetPeriodDto; faculty: GetFacultyDto }>) {
        try {
            const { user, periodInfo, faculty } = job.data
            const frontendUrl = this.configService.get('appConfig.CLIENT_URL')
            const periodName = `${periodInfo.semester} năm học ${periodInfo.year}`
            const message = `Hệ thống đã mở đợt đăng ký đề tài cho ${periodInfo.semester} năm học ${periodInfo.year}.`

            await this.mailerService.sendMail({
                to: user.email,
                from: `"Ban chủ nhiệm Khoa ${faculty.name}" <${faculty.email}>`,
                subject: `📢 [Thông báo] Mở cổng đăng ký - ${periodName}`,
                template: './period-open-registration',
                context: {
                    name: user.fullName || 'Sinh viên/Giảng viên',
                    periodName: periodName,
                    message: message,
                    link: `${frontendUrl}/periods/${periodInfo._id}/register`
                }
            })
        } catch (e) {
            console.error(`Gửi mail open registration thất bại cho ${job.data.user._id}:`, e)
        }
    }

    @Process('send-new-semester-welcome')
    async handleSendNewSemesterWelcome(job: Job<{ user: User; periodInfo: GetPeriodDto; faculty: GetFacultyDto }>) {
        try {
            const { user, periodInfo, faculty } = job.data
            const frontendUrl = this.configService.get('appConfig.CLIENT_URL')
            const periodName = `${periodInfo.semester} năm học ${periodInfo.year}`
            const message = `Học kỳ mới - ${periodInfo.semester} năm học ${periodInfo.year} đã bắt đầu. Chúc bạn một học kỳ thành công và nhiều trải nghiệm thú vị!`

            await this.mailerService.sendMail({
                to: user.email,
                from: `"Ban chủ nhiệm Khoa ${faculty.name}" <${faculty.email}>`,
                subject: `🎉 Chào mừng học kỳ mới - ${periodName}`,
                template: './new-semester-welcome',
                context: {
                    name: user.fullName || 'Bạn',
                    periodName: periodName,
                    message: message,
                    link: `${frontendUrl}/dashboard`
                }
            })
        } catch (e) {
            console.error(`Gửi mail welcome semester thất bại cho ${job.data.user._id}:`, e)
        }
    }

    @Process('send-topic-approval')
    async handleSendTopicApproval(job: Job<{ user: User; topicInfo: GetMiniTopicInfo; faculty: GetFacultyDto }>) {
        try {
            const { user, topicInfo, faculty } = job.data
            const frontendUrl = this.configService.get('appConfig.CLIENT_URL')

            await this.mailerService.sendMail({
                to: user.email,
                from: `"Ban Chủ Nhiệm Khoa" <${faculty.email}>`,
                subject: ` Đề tài của bạn đã được chấp thuận`,
                template: './topic-approval-success',
                context: {
                    name: user.fullName,
                    titleVN: topicInfo.titleVN,
                    titleEng: topicInfo.titleEng,
                    link: `${frontendUrl}/detail-topic/${topicInfo._id}`,
                    facultyName: faculty.name
                }
            })
        } catch (e) {
            console.error('Gửi mail duyệt đề tài thất bại:', e)
        }
    }
    @Process('send-manual-email')
    async handleSendEmailManual(
        job: Job<{ to: string; subject: string; content: string; currentPeriod: GetPeriodDto }>
    ) {
        console.log('subject :::', job.data.subject)

        try {
            await this.mailerService.sendMail({
                to: job.data.to,
                from: `Ban chủ nhiệm ${job.data.currentPeriod.faculty.name} <${job.data.currentPeriod.faculty.email}>`,
                subject: job.data.subject,
                template: './manual-notification',
                context: {
                    subject: job.data.subject,
                    content: job.data.content,
                    currPeriod: job.data.currentPeriod
                }
            })
            //bắn socket cho rằng đã gửi mail
        } catch (e) {
            console.error('Gửi mail tùy chỉnh thất bại:', e)
        }
    }
    @Process('send-co-supervisor-assigned-notification')
    async handleSendCoSupervisorAssignedNotification(
        job: Job<{ coSupervisorUser: User; topicInfo: GetMiniTopicInfo; faculty: GetFacultyDto }>
    ) {
        try {
            const { coSupervisorUser, topicInfo, faculty } = job.data
            const frontendUrl = this.configService.get('appConfig.CLIENT_URL')
            await this.mailerService.sendMail({
                to: coSupervisorUser.email,
                from: `Ban chủ nhiệm ${faculty.name} <${faculty.email}>`,
                subject: `Bạn được thêm vào đề tài với vai trò Đồng hướng dẫn`,
                template: './co-supervisor-assigned',
                context: {
                    name: coSupervisorUser.fullName,
                    titleVN: topicInfo.titleVN,
                    titleEng: topicInfo.titleEng,
                    link: `${frontendUrl}/detail-topic/${topicInfo._id}`,
                    facultyName: faculty.name
                }
            })
        } catch (e) {
            console.error(`Gửi mail đồng hướng dẫn thất bại:`, e)
        }
    }
}
