import { forwardRef, Module } from '@nestjs/common'
import { NotificationsService } from './application/notifications.service'
import { JwtModule } from '@nestjs/jwt'
import jwtConfig from '../../auth/config/jwt.config'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { Notification, NotificationSchema } from './schemas/notification.schemas'
import { NotificationsGateway } from './gateways/notifications.gateway'
import { NotificationsController } from './notifications.controller'
import { BullModule } from '@nestjs/bull'
import { OnlineUserService } from './application/online-user.service'
import { NotificationPublisherService } from './publisher/notification.publisher.service'
import { UsersModule } from '../../users/users.module'
import { NotificationQueueProcessor } from './processors/notification.processor'
import { UserVerifyInfoService } from './providers/user-verify.info.services'
import { AuthModule } from '../../auth/auth.module'
import { PersonalNotificationProvider } from './providers/practice-actions.provider'
import { RegistrationsModule } from '../registrations/registrations.module'

@Module({
    providers: [
        NotificationsGateway,
        NotificationsService,
        OnlineUserService,
        NotificationPublisherService,
        NotificationQueueProcessor,
        PersonalNotificationProvider,
        UserVerifyInfoService
    ],
    imports: [
        MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
        ConfigModule.forFeature(jwtConfig),
        JwtModule.registerAsync(jwtConfig.asProvider()),
        BullModule.registerQueue({ name: 'notifications' }),
        forwardRef(() => UsersModule),
        forwardRef(() => RegistrationsModule)
    ],
    exports: [PersonalNotificationProvider],
    controllers: [NotificationsController]
})
export class NotificationsModule {}
