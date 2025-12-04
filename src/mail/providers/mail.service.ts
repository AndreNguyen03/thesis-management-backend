import { MailerService } from '@nestjs-modules/mailer'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { User } from '../../users/schemas/users.schema'

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
                name: user.fullName,
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
}
