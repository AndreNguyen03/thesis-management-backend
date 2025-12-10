import { forwardRef, Global, Module } from '@nestjs/common'
import { MailService } from './providers/mail.service'
import { MailProcessor } from './providers/mail.processor'
import { MailerModule } from '@nestjs-modules/mailer'
import { ConfigService } from '@nestjs/config'
import { join } from 'path'
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter'
import { MailController } from './mail.controller'
import { UsersModule } from '../users/users.module'
import Bull from 'bull'
import { BullModule } from '@nestjs/bull'
import { PeriodsModule } from '../modules/periods/periods.module'

@Global()
@Module({
    imports: [
        MailerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => ({
                transport: {
                    host: config.get<string>('appConfig.mailHost'),
                    secure: false,
                    port: Number(config.get<string>('appConfig.mailPort')),
                    auth: {
                        user: config.get<string>('appConfig.smtpUsername'),
                        pass: config.get<string>('appConfig.smtpPassword')
                    }
                },
                default: {
                    from: `UIT Thesis <no-reply@uit-thesis.com>`
                },
                template: {
                    dir: join(__dirname, 'templates'),
                    adapter: new EjsAdapter({
                        inlineCssEnabled: true
                    }),
                    options: {
                        strict: false
                    }
                }
            })
        }),
        UsersModule,
        BullModule.registerQueue({ name: 'mail-queue' }),
        forwardRef(() => PeriodsModule)
    ],
    providers: [MailService, MailProcessor],
    exports: [MailService],
    controllers: [MailController]
})
export class MailModule {}
