import { IsOptional, IsEnum, IsString } from 'class-validator'
import { TopicSnapshot } from '../schemas/chatbot-conversation.schema'
import { Expose, Type } from 'class-transformer'

export class GetConversationsQuery {
    @IsEnum(['active', 'archived'])
    @IsOptional()
    status?: 'active' | 'archived' = 'active'
    @IsString()
    @IsOptional()
    search?: string
}
export class TopicSnapshotDto {
    @Expose()
    _id: string
    @Expose()
    titleVN: string
    @Expose()
    titleEng: string
    @Expose()
    description: string
    @Expose()
    fields: string
    @Expose()
    requirements: string

    @Expose()
    major: string
    @Expose()
    lecturers: string
    @Expose()
    maxStudents: number
    @Expose()
    type: string
    @Expose()
    similarityScore: number
}
export class ConversationMessage {
    @Expose()
    id: string
    @Expose()
    role: 'user' | 'assistant'
    @Expose()
    content: string
    @Expose()
    @Type(() => TopicSnapshotDto)
    topics?: TopicSnapshotDto[] // Lưu topics từ search_topics tool
    @Expose()
    timestamp: Date
}
export class GetConversationsDto {
    @Expose()
    _id: string
    @Expose()
    userId: string
    @Expose()
    title: string
    @Expose()
    @Type(() => ConversationMessage)
    messages: ConversationMessage[]
    @Expose()
    status: 'active' | 'archived'
    @Expose()
    lastMessageAt: Date
}
