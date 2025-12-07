import { MailerService } from '@nestjs-modules/mailer'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { User } from '../../users/schemas/users.schema'
import { GetFacultyDto } from '../../modules/faculties/dtos/faculty.dtos'
import { fa } from '@faker-js/faker/.'
import { GetMiniTopicInfo } from '../../modules/topics/dtos'
import { GetPeriodDto } from '../../modules/periods/dtos/period.dtos'
import { transferNamePeriod } from '../../common/utils/transfer-name-period'

@Injectable()
export class MailService {
    constructor(
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService
    ) {}

    private isTestEnv() {
        return this.configService.get<string>('NODE_ENV') === 'test'
    }

    public async sendUserWelcomeMail(user: User): Promise<void> {
        if (this.isTestEnv()) return

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
    }

    public async sendResetPasswordMail(user: User, token: string): Promise<void> {
        if (this.isTestEnv()) return

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
    }

    public async sendNotificationMail(user: User, subject: string, content: string): Promise<void> {
        if (this.isTestEnv()) return

        await this.mailerService.sendMail({
            to: user.email,
            from: `UIT Thesis <${this.configService.get('appConfig.smtpUsername')}>`,
            subject,
            text: content
        })
    }
    //Gửi email nhắc nhở về việc chưa gửi đủ đề tài
    public async sendReminderSubmitTopicMail(
        user: User,
        message: string,
        deadline: Date,
        metadata: Record<string, any>,
        faculty: GetFacultyDto
    ): Promise<void> {
        if (this.isTestEnv()) return
        const frontendUrl = this.configService.get('appConfig.frontendUrl')
        const senderName = `Ban Chủ Nhiệm Khoa ${faculty.name}`
        console.log('Sending reminder mail to:', senderName, faculty)
        await this.mailerService.sendMail({
            to: user.email,
            from: senderName,
            replyTo: faculty.email,
            template: './reminder-lecturer-topic',
            subject: 'Nhắc nhở nộp đề tài',
            text: message,
            context: {
                lecturerName: user.fullName,

                // Thông tin đợt & Deadline
                periodName: metadata.periodName,
                deadline: new Date(deadline).toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }),

                // --- QUAN TRỌNG: TIẾN ĐỘ SỐ LƯỢNG ---
                currentCount: metadata.currentCount || 0,
                requiredCount: metadata.requiredCount || 0,

                // Link đến trang quản lý đề tài của Giảng viên
                link: `${frontendUrl}/lecturer/topics-management`,

                // Thông tin footer
                facultyName: faculty.name,
                facultyEmail: faculty.email,
                facultyWebsite: faculty.urlDirection,
                senderName: senderName
            }
        })
    }

    // 1. Gửi thông báo Mở đợt đăng ký
    async sendPeriodOpenRegistrationNotification(user: User, periodInfo: GetPeriodDto, faculty: GetFacultyDto) {
        // ... (Logic tạo Notification cũ của bạn giữ nguyên) ...
        const message = `Hệ thống đã mở đợt đăng ký đề tài cho {periodInfo.semestic} năm học {periodInfo.year}.`
        const periodName = transferNamePeriod(periodInfo)
        try {
            const frontendUrl = this.configService.get('appConfig.CLIENT_URL')

            await this.mailerService.sendMail({
                to: user.email,
                from: `"Ban chủ nhiệm Khoa {faculty.name}" <${this.configService.get('appConfig.smtpUsername')}>`,
                subject: `📢 [Thông báo] Mở cổng đăng ký - ${periodName}`,
                template: './period-open-registration', // Tên file EJS
                context: {
                    name: user.fullName || 'Sinh viên/Giảng viên',
                    periodName: periodName,
                    message: message, // Truyền câu message đã tạo ở trên
                    link: `${frontendUrl}/periods/${periodInfo._id}/register` // Link thẳng tới trang đăng ký
                }
            })
        } catch (error) {
            console.error(`Gửi mail thất bại cho ${user._id}:`, error.message)
        }
    }

    // 2. Gửi thông báo Chào mừng kỳ mới
    async sendNewSemesticOpenGeneralNotification(user: User, periodInfo: GetPeriodDto, faculty: GetFacultyDto) {
        const message = `Học kỳ mới - {periodInfo.semestic} năm học {periodInfo.year} đã bắt đầu. Chúc bạn một học kỳ thành công và nhiều trải nghiệm thú vị!`
        const periodName = transferNamePeriod(periodInfo)
        try {
            const frontendUrl = this.configService.get('appConfig.CLIENT_URL')

            await this.mailerService.sendMail({
                to: user.email,
                from: `"Ban chủ nhiệm Khoa {faculty.name}" <${this.configService.get('appConfig.smtpUsername')}>`,
                subject: `🎉 Chào mừng học kỳ mới - ${periodName}`,
                template: './new-semester-welcome', // Tên file EJS
                context: {
                    name: user.fullName || 'Bạn',
                    periodName: periodName,
                    message: message,
                    link: `${frontendUrl}/dashboard` // Link về dashboard
                }
            })
        } catch (error) {
            console.error(`Gửi mail welcome thất bại cho ${user._id}:`, error.message)
        }
    }

    //Gửi thống báo đề tài được chấp thuận
    async sendApprovalTopicNotification(user: User, topicInfo: GetMiniTopicInfo, faculty: GetFacultyDto) {
        const frontendUrl = this.configService.get('appConfig.CLIENT_URL')
        try {
            if (user && user.email) {
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
            }
        } catch (e) {
            console.error('Gửi mail duyệt đề tài thất bại:', e)
        }
    }
    async sendAssignedCoSupervisorNotification(
        coSupervisorUser: User,
        topicInfo: GetMiniTopicInfo,
        faculty: GetFacultyDto
    ) {
        try {
            const frontendUrl = this.configService.get('appConfig.CLIENT_URL')
            console.log('Gửi mail đồng hướng dẫn cho:', coSupervisorUser.email, faculty, frontendUrl)
            if (coSupervisorUser && coSupervisorUser.email) {
                await this.mailerService.sendMail({
                    to: coSupervisorUser.email,
                    from: `"Hệ thống Quản lý Khóa luận UIT" <${faculty.email}>`,
                    subject: `Bạn được thêm làm Đồng hướng dẫn`,
                    template: './co-supervisor-assigned',
                    context: {
                        name: coSupervisorUser.fullName,
                        titleVN: topicInfo.titleVN,
                        titleEng: topicInfo.titleEng,
                        link: `${frontendUrl}/detail-topic/${topicInfo._id}`,
                        facultyName: faculty.name
                    }
                })
            }
        } catch (e) {
            console.error(`Gửi mail đồng hướng dẫn cho ${coSupervisorUser._id} thất bại:`, e)
        }
    }
}
