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
import { RecipientType } from '../../modules/notifications/enum/recipient-type.enum'

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

    // 0. Gửi email chuẩn bị trước khi mở đợt đăng ký (3 ngày trước)
    async sendUpcomingOpenRegistrationNotification(
        users: User[],
        periodInfo: GetPeriodDto,
        faculty: GetFacultyDto,
        startDate: Date,
        jobId: string,
        delayMs?: number
    ) {
        this.cancelScheduledJob(jobId)

        const daysRemaining = Math.ceil((startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

        for (let i = 0; i < users.length; i++) {
            await this.mailQueue.add(
                'send-upcoming-open-registration',
                {
                    user: users[i],
                    periodInfo,
                    faculty,
                    startDate,
                    daysRemaining
                },
                {
                    jobId: `${jobId}-upcoming`,
                    delay: (delayMs ?? 0) + i * 500,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    }
                }
            )
        }
    }

    // 1. Gửi thông báo Mở đợt đăng ký
    async sendPeriodOpenRegistrationNotification(
        users: User[],
        periodInfo: GetPeriodDto,
        faculty: GetFacultyDto,
        jobId: string,
        delayMs?: number
    ) {
        this.cancelScheduledJob(jobId)

        for (let i = 0; i < users.length; i++) {
            await this.mailQueue.add(
                'send-period-open-registration',
                {
                    user: users[i],
                    periodInfo,
                    faculty
                },
                {
                    jobId: jobId,
                    delay: (delayMs ?? 0) + i * 500,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    }
                }
            )
        }
    }
    // 1.5 Gửi email chuẩn bị trước khi kỳ học bắt đầu (3 ngày trước)
    async sendUpcomingNewSemesterNotification(
        users: User[],
        periodInfo: GetPeriodDto,
        faculty: GetFacultyDto,
        startDate: Date,
        jobId: string,
        delayMs?: number
    ) {
        this.cancelScheduledJob(jobId)

        const daysRemaining = Math.ceil((startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

        for (let i = 0; i < users.length; i++) {
            await this.mailQueue.add(
                'send-upcoming-new-semester',
                {
                    user: users[i],
                    periodInfo,
                    faculty,
                    startDate,
                    daysRemaining
                },
                {
                    jobId: `${jobId}-upcoming`,
                    delay: (delayMs ?? 0) + i * 500,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    }
                }
            )
        }
    }

    // 2. Gửi thông báo Chào mừng kỳ mới
    async sendNewSemesticOpenGeneralNotification(
        users: User[],
        periodInfo: GetPeriodDto,
        faculty: GetFacultyDto,
        jobId: string,
        delayMs?: number
    ) {
        this.cancelScheduledJob(jobId)
        for (let i = 0; i < users.length; i++) {
            await this.mailQueue.add(
                'send-new-semester-welcome',
                {
                    user: users[i],
                    periodInfo,
                    faculty
                },
                {
                    jobId: jobId ? jobId : undefined,
                    delay: (delayMs ?? 0) + i * 500, // Delay 0.5s cho mỗi email
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    }
                }
            )
        }
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

    async sendNeedAdjustmentNotification(
        comment: string,
        user: User,
        topicInfo: GetMiniTopicInfo,
        faculty: GetFacultyDto
    ) {
        if (user && user.email) {
            await this.mailQueue.add('send-topic-need-adjustment', {
                comment,
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

        for (let i = 0; i < recipientEmails.length; i++) {
            await this.mailQueue.add(
                'send-manual-email',
                {
                    to: recipientEmails[i],
                    subject: subject,
                    content: content,
                    currentPeriod: currPeriod
                },
                {
                    delay: i * 5000, // Delay 5s cho mỗi email
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    }
                }
            )
        }
    }
    private async cancelScheduledJob(jobId: string) {
        try {
            const job = await this.mailQueue.getJob(jobId)
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

    // Thêm vào MailService class
    async sendSubmitTopicRequestEmail(data: {
        users: User[]
        periodName: string
        deadline: string
        periodId: string
    }): Promise<void> {
        if (this.isTestEnv()) return

        const { users, periodName, deadline, periodId } = data

        for (let i = 0; i < users.length; i++) {
            await this.mailQueue.add(
                'send-submit-topic-request',
                {
                    to: users[i].email,
                    lecturerName: users[i].fullName,
                    periodName,
                    deadline,
                    periodId
                },
                {
                    delay: i * 2000,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    }
                }
            )
        }
    }

    async sendDefenseScoresPublished(data: {
        students: User[]
        topicTitle: string
        councilName: string
        location: string
        defenseDate: Date
        finalScore: number
        gradeText: string
        scores: Array<{ roleLabel: string; scorerName: string; total: number; comment?: string }>
        facultyName: string
    }): Promise<void> {
        if (this.isTestEnv()) return

        const { students, topicTitle, councilName, location, defenseDate, finalScore, gradeText, scores, facultyName } =
            data
        const portalUrl = this.configService.get('appConfig.CLIENT_URL')

        for (let i = 0; i < students.length; i++) {
            await this.mailQueue.add(
                'send-defense-scores-published',
                {
                    to: students[i].email,
                    studentName: students[i].fullName,
                    topicTitle,
                    councilName,
                    location,
                    defenseDate: new Date(defenseDate).toLocaleDateString('vi-VN'),
                    finalScore: finalScore.toFixed(2),
                    gradeText,
                    scores,
                    hasComments: scores.some((s) => s.comment),
                    portalUrl,
                    facultyName
                },
                {
                    delay: i * 1000, // Delay 1s per email
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
