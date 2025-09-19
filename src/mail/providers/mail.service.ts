import { MailerService } from '@nestjs-modules/mailer'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { User } from '../../users/schemas/user.schema'

@Injectable()
export class MailService {
    constructor(
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService
    ) {}

    public async sendUserWelcomeMail(user: User): Promise<void> {
        const env = this.configService.get<string>('NODE_ENV')

        if (env === 'test') {
            // 👇 Không gửi mail trong môi trường test
            return
        }

        await this.mailerService.sendMail({
            to: user.email,
            from: `Onboarding Team <support@nestjs-blog.com>`,
            subject: 'Welcome to NestJs Blog',
            template: './welcome',
            context: {
                name: user.fullName,
                email: user.email,
                loginUrl: 'http://localhost:3000'
            }
        })
    }

    public async sendResetPasswordMail(user: User, token: string): Promise<void> {
        const env = this.configService.get<string>('NODE_ENV')

        if (env === 'test') {
            return
        }

        const clientUrl = this.configService.get<string>('appConfig.clientUrl')
        const resetUrl = `${clientUrl}/reset-password?token=${token}`

        await this.mailerService.sendMail({
            to: user.email,
            subject: 'Password Reset Request',
            template: './reset-password',
            context: {
                name: user.fullName,
                email: user.email,
                resetUrl
            }
        })
    }
}
