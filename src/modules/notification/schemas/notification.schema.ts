import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Types, Document, HydratedDocument } from 'mongoose'

export enum NotificationType {
    SYSTEM = 'system',
    TOPIC = 'topic',
    MESSAGE = 'message'
}

export type NotificationDocument = HydratedDocument<Notification> & {
    createdAt: Date
    updatedAt: Date
}

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
    @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
    userId: Types.ObjectId // target user notification

    @Prop({ required: true })
    content: string

    @Prop({ type: String, enum: NotificationType, default: NotificationType.SYSTEM })
    type: NotificationType

    @Prop({ default: false })
    seen: boolean

    @Prop()
    link?: string

    @Prop({ type: Object })
    meta?: Record<string, any>
}

export const NotificationSchema = SchemaFactory.createForClass(Notification)
