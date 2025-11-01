import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ChatbotStatus } from '../enums/chatbot-status.enum'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ _id: false })
export class QuerySuggestion {
    @Prop({ required: true })
    id: string // ID của Chatbot

    @Prop({ required: true })
    content: string
}
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'chatbot_versions' })
export class ChatbotVersion extends BaseEntity {
    @Prop({ required: true })
    name: string
    @Prop({ required: true, enum: ChatbotStatus })
    status: ChatbotStatus
    @Prop({ required: false, ref: 'KnowledgeSource', type: mongoose.Schema.Types.ObjectId, default: [] })
    knowledge_sourceIds: string[]
    @Prop({ required: false, type: [QuerySuggestion] })
    query_suggestions: QuerySuggestion[]
}
export const ChatBotVersionSchema = SchemaFactory.createForClass(ChatbotVersion)
