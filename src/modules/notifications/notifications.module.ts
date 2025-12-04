import { Module } from '@nestjs/common'
import { NotificationsService } from './application/notifications.service'
import { JwtModule } from '@nestjs/jwt'
import jwtConfig from '../../auth/config/jwt.config'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { Notification, NotificationSchema } from './schemas/notification.schemas'
import { NotificationsGateway } from './gateways/notifications.gateway'
import { NotificationsController } from './notifications.controller';

@Module({
    providers: [NotificationsService, NotificationsGateway],
    imports: [
        MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
        ConfigModule.forFeature(jwtConfig),
        JwtModule.registerAsync(jwtConfig.asProvider())
    ],
    controllers: [NotificationsController]
})
export class NotificationsModule {}
