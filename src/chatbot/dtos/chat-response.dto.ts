import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator'

export class ChatResponseDto {

    @IsString()
    role: string // 'assistant'

    @IsString()
    content: string // Nội dung phản hồi

    @IsOptional()
    metadata?: {
        model?: string
        tokens?: number
        finishReason?: string
        usage?: {
            promptTokens: number
            completionTokens: number
            totalTokens: number
        }
    }

    @IsOptional()
    timestamp?: Date
}

export class StreamChunkDto {
    @IsString()
    @IsOptional()
    content?: string // Chunk nội dung

    @IsBoolean()
    @IsOptional()
    done?: boolean // Đã hoàn thành stream

    @IsString()
    @IsOptional()
    error?: string // Lỗi nếu có

    @IsOptional()
    metadata?: any
}

export class ChatHistoryDto {
    @IsString()
    chatId: string

    @IsString()
    userId: string

    @IsString()
    title: string

    @IsNumber()
    messageCount: number

    @IsOptional()
    lastMessage?: string

    @IsOptional()
    lastMessageAt?: Date

    @IsOptional()
    createdAt?: Date

    @IsOptional()
    updatedAt?: Date
}
