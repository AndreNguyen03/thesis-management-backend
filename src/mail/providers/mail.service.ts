import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { User } from '../../users/schemas/users.schema'
import { GetFacultyDto } from '../../modules/faculties/dtos/faculty.dtos'
import { GetMiniTopicInfo } from '../../modules/topics/dtos'
import { GetPeriodDto } from '../../modules/periods/dtos/period.dtos'
import { RecipientMode, SendData } from '../dtos/send-data.dtos'
import { PeriodsService } from '../../modules/periods/application/periods.service'
import { UserService } from '../../users/application/users.service'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bullmq'

@Injectable()
export class MailService {
    constructor(
        private readonly configService: ConfigService,
        private readonly periodService: PeriodsService,
        private readonly userService: UserService,
        @InjectQueue('mail-queue') private readonly mailQueue: Queue
    ) {}

    private isTestEnv() {
        return this.configService.get<string>('NODE_ENV') === 'test'
    }

    public async sendUserWelcomeMail(user: User): Promise<void> {
        if (this.isTestEnv()) return

        await this.mailQueue.add('send-user-welcome', {
            user
        })
    }

    public async sendResetPasswordMail(user: User, token: string): Promise<void> {
        if (this.isTestEnv()) return

        await this.mailQueue.add('send-reset-password', {
            user,
            token
        })
    }

    public async sendNotificationMail(user: User, subject: string, content: string): Promise<void> {
        if (this.isTestEnv()) return

        await this.mailQueue.add('send-notification', {
            user,
            subject,
            content
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

        await this.mailQueue.add('send-reminder-submit-topic', {
            user,
            message,
            deadline,
            metadata,
            faculty
        })
    }

    // 1. Gửi thông báo Mở đợt đăng ký
    async sendPeriodOpenRegistrationNotification(user: User, periodInfo: GetPeriodDto, faculty: GetFacultyDto) {
        await this.mailQueue.add('send-period-open-registration', {
            user,
            periodInfo,
            faculty
        })
    }

    // 2. Gửi thông báo Chào mừng kỳ mới
    async sendNewSemesticOpenGeneralNotification(user: User, periodInfo: GetPeriodDto, faculty: GetFacultyDto) {
        await this.mailQueue.add('send-new-semester-welcome', {
            user,
            periodInfo,
            faculty
        })
    }

    //Gửi thống báo đề tài được chấp thuận
    async sendApprovalTopicNotification(user: User, topicInfo: GetMiniTopicInfo, faculty: GetFacultyDto) {
        if (user && user.email) {
            await this.mailQueue.add('send-topic-approval', {
                user,
                topicInfo,
                faculty
            })
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
                await this.mailQueue.add('send-co-supervisor-assigned-notification', {
                    coSupervisorUser,
                    topicInfo,
                    faculty
                })
            }
        } catch (e) {
            console.error(`Gửi mail đồng hướng dẫn cho ${coSupervisorUser._id} thất bại:`, e)
        }
    }

    async sendCustomEmail(periodId: string, body: SendData) {
        const { recipientMode, recipients, subject, content } = body
        const currPeriod = await this.periodService.getPeriodById(periodId)
        if (!currPeriod) throw new BadRequestException('Kỳ học không tồn tại')
        let recipientEmails: string[] = []
        switch (recipientMode) {
            case RecipientMode.CUSTOM_INSTRUCTORS:
                if (recipients && recipients.length > 0) {
                    //đi tìm email của người nhận
                    recipientEmails = await this.userService.getEmailListOfUsers(recipients)
                } else throw new BadRequestException('Bổ sung thông tin người nhận')
                break
            case RecipientMode.ALL_STUDENTS:
                //lấy tất cả email sinh viên trong kì (thực tế là khoa)
                recipientEmails = await this.userService.getEmailListFromStudentInFaculty(
                    currPeriod.faculty._id.toString()
                )
                break
            case RecipientMode.ALL_INSTRUCTORS:
                //lấy tất cả email giảng viên trong kì (thực tế là khoa)
                recipientEmails = await this.userService.getEmailListFromLecturerInFaculty(
                    currPeriod.faculty._id.toString()
                )
                break
        }
        console.log('recipientEmails :::', recipientEmails.length)
        console.log('subject :::', subject)
        for (let i = 0; i < recipientEmails.length; i++) {
            for (const email of recipientEmails) {
                await this.mailQueue.add(
                    'send-manual-email',
                    {
                        to: email,
                        subject: subject,
                        content: content,
                        currentPeriod: currPeriod
                    },
                    {
                        delay: i * 1000, // Delay 1s cho mỗi email
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 2000 
                        }
                    }
                )
            }
        }
    }
}
