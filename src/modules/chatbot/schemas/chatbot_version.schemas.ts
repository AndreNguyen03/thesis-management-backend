import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ChatbotStatus } from '../enums/chatbot-status.enum'
import mongoose from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { extend } from 'joi'
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ _id: false })
export class QuerySuggestion extends BaseEntity {
    @Prop({ required: true, type: String })
    content: string
    @Prop({ required: true, type: Boolean, default: true })
    enabled: boolean
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
    @Prop({ required: true })
    description: string
    @Prop({ required: true, enum: ChatbotStatus, default: ChatbotStatus.DISABLED })
    status: ChatbotStatus
    // @Prop({ required: false, ref: 'KnowledgeSource', type: [mongoose.Schema.Types.ObjectId], default: [] })
    // knowledge_sourceIds: string[]
    @Prop({ required: false, type: [QuerySuggestion] })
    query_suggestions: QuerySuggestion[]
}
export const ChatBotVersionSchema = SchemaFactory.createForClass(ChatbotVersion)
