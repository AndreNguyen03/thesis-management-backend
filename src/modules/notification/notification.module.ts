import { Module } from '@nestjs/common'
import { NotificationService } from './services/notification.service'
import { NotificationController } from './controllers/notification.controller'
import { NotificationGateway } from './gateways/notification.gateway'
import { MongooseModule } from '@nestjs/mongoose'
import { NotificationSchema } from './schemas/notification.schema'
import { BullModule } from '@nestjs/bull'
import { NotificationPublisherService } from './publisher/notification.publisher.service'
import { NotificationQueueProcessor } from './processors/notification.processor'
import { MailService } from '../../mail/providers/mail.service'

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
        BullModule.registerQueue({ name: 'notifications' })
    ],
    controllers: [NotificationController],
    providers: [
        NotificationService,
        NotificationGateway,
        NotificationPublisherService,
        NotificationQueueProcessor,
        MailService
    ],
    exports: [NotificationService, NotificationPublisherService]
})
export class NotificationModule {}
