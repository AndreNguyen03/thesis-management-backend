import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import mongoose, { HydratedDocument } from 'mongoose'
import { GetFieldNameReponseDto } from '../../fields/dtos/get-fields.dto'
import { GetRequirementNameReponseDto } from '../../requirements/dtos/get-requirement.dto'
import { GetMajorMiniDto } from '../../majors/dtos/get-major.dto'
import { ResponseMiniLecturerDto } from '../../../users/dtos/lecturer.dto'
import { User } from '../../../users/schemas/users.schema'

export class TopicSnapshot {
    _id: string
    titleVN: string
    titleEng: string
    description: string
    fields: GetFieldNameReponseDto[]
    requirements: GetRequirementNameReponseDto[]
    major: GetMajorMiniDto
    lecturers: ResponseMiniLecturerDto[]
    maxStudents: number
    type: string
}

// Message trong conversation
@Schema({ _id: false })
export class ConversationMessage {
    @Prop({ required: true })
    id: string

    @Prop({ required: true, enum: ['user', 'assistant'] })
    role: 'user' | 'assistant'

    @Prop({ type: String, required: true })
    content: string

    @Prop({ type: [TopicSnapshot], default: null })
    topics?: TopicSnapshot[] // Lưu topics từ search_topics tool

    @Prop({ default: Date.now })
    timestamp: Date
}

// Conversation Schema
@Schema({
    collection: 'chatbot_conversations',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
export class ChatbotConversation extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true, index: true })
    userId: mongoose.Schema.Types.ObjectId

    @Prop({ default: 'Chat mới' })
    title: string

    @Prop({ type: [ConversationMessage], default: [] })
    messages: ConversationMessage[]

    @Prop({
        type: String,
        enum: ['active', 'archived'],
        default: 'active',
        index: true
    })
    status: 'active' | 'archived'

    @Prop({ type: Date, default: Date.now })
    lastMessageAt: Date
}

export type ChatbotConversationDocument = HydratedDocument<ChatbotConversation>
export const ChatbotConversationSchema = SchemaFactory.createForClass(ChatbotConversation)
export const ConversationMessageSchema = SchemaFactory.createForClass(ConversationMessage)

// Index để query nhanh conversations của user
ChatbotConversationSchema.index({ userId: 1, status: 1, lastMessageAt: -1 })
