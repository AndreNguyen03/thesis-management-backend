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
import { RegistrationsModule } from '../registrations/registrations.module'
import { PeriodsModule } from '../periods/periods.module'
import { MailModule } from '../../mail/mail.module'
import { Faculty } from '../faculties/schemas/faculty.schema'
import { FacultyModule } from '../faculties/faculty.module'
import { PaginationAnModule } from '../../common/pagination-an/pagination.module'
//Module thông báo, gửi email để thông báo
@Module({
    providers: [
        NotificationsGateway,
        NotificationsService,
        OnlineUserService,
        NotificationPublisherService,
        NotificationQueueProcessor,
        UserVerifyInfoService
    ],
    imports: [
        MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
        ConfigModule.forFeature(jwtConfig),
        JwtModule.registerAsync(jwtConfig.asProvider()),
        BullModule.registerQueue({ name: 'notifications' }),
        forwardRef(() => UsersModule),
        forwardRef(() => RegistrationsModule),
        forwardRef(() => PeriodsModule),
        MailModule,
        FacultyModule,
        PaginationAnModule
    ],
    exports: [NotificationPublisherService],
    controllers: [NotificationsController]
})
export class NotificationsModule {}
