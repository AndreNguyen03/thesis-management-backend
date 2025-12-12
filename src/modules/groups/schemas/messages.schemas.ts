// schemas/message.schema.ts

import { Prop, Schema } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { User } from '../../../users/schemas/users.schema'
import { Group } from './groups.schemas'

// Message giữ đơn giản, chỉ chứa nội dung chi tiết
@Schema({ timestamps: true, collection: 'messages' })
export class Message {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Group.name, required: true, index: true })
    conversationId: string

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
    senderId: string
    @Prop({ required: true })
    content: string

    @Prop({ type: [String], default: [] }) // Lưu URL ảnh/file
    attachments: string[]

    // Có thể thêm field này để biết ai đã seen cụ thể tin nhắn này (nếu cần chi tiết)
    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: User.name }] })
    seenBy: string[]
}
