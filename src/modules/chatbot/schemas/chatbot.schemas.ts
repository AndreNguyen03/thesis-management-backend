import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import mongoose, { HydratedDocument } from 'mongoose'
import { UserRole } from '../../../tokens/schemas/token.schema'

// Schema cho phần nội dung của message trong chatbot
@Schema({ _id: false })
export class MessagePart {
    @Prop({ type: String, required: true })
    type: 'text' | 'step-start' // 'text', 'step-start', 'step-end', 'image', etc.

    @Prop({ type: String })
    text?: string // Nội dung text

}

// Schema cho tin nhắn chatbot
@Schema({ _id: false })
export class ChatMessage {
    @Prop({ required: true })
    id: string // ID của message

    @Prop({ required: true, enum: ['user', 'assistant', 'system'] })
    role: string // 'user', 'assistant', 'system'

    @Prop({ type: [MessagePart], default: [] })
    parts: MessagePart[] // Các phần của message

    @Prop({ type: mongoose.Schema.Types.Mixed })
    metadata?: any // Metadata của message

    @Prop({ default: Date.now })
    timestamp: Date // Thời gian tạo message
}

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
export class ChatBot extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
    userId: mongoose.Schema.Types.ObjectId // ID của user

    @Prop({ required: true })
    roles: UserRole // Vai trò của user

    @Prop({ type: [ChatMessage], default: [] })
    chatMessages: ChatMessage[] // Danh sách tin nhắn với chatbot

    @Prop({ default: 'Cuộc trò chuyện mới' })
    title?: string // Tiêu đề cuộc hội thoại

    @Prop({ default: 'active' })
    status?: string // 'active', 'archived', 'ended'

    @Prop({ default: 0 })
    messageCount?: number // Số lượng tin nhắn trong cuộc hội thoại
}4

export type ChatDocument = HydratedDocument<ChatBot>
export const ChatBotSchema = SchemaFactory.createForClass(ChatBot)
export const MessagePartSchema = SchemaFactory.createForClass(MessagePart)
export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage)
