// schemas/message.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { User } from '../../../users/schemas/users.schema'
import { Group } from './groups.schemas'
import { BaseEntity } from '../../../shared/base/entity/base.entity'

// Message giữ đơn giản, chỉ chứa nội dung chi tiết
@Schema({ timestamps: true, collection: 'messages' })
export class Message extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Group.name, required: true, index: true })
    groupId: string

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
    senderId: string

    @Prop({ required: true })
    content: string

    @Prop({ enum: ['text', 'file', 'image'], default: 'text' }) // Thêm
    type: string

    @Prop({ type: [String], default: [] })
    attachments: string[]

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null }) // Thêm cho reply
    replyTo?: string

    @Prop({ default: false }) // Thêm
    isEdited: boolean

    updatedAt: Date
    createdAt: Date
}

export const MessageSchema = SchemaFactory.createForClass(Message)
// Index tối ưu cho việc sort conversation theo tin nhắn mới nhất
