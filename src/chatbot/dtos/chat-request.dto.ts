import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class MessageContentDto {
    @IsString()
    @IsNotEmpty()
    type: 'text' | 'image' // 'text', 'image', 'file', etc.

    @IsString()
    @IsOptional()
    text?: string // Nội dung text

    @IsOptional()
    data?: any // Dữ liệu khác (file, image, etc.)

    @IsOptional()
    state?: any // Trạng thái bổ sung
}

export class ChatMessageDto {
    @IsNotEmpty()
    id: string
    @IsString()
    @IsOptional()
    role?: string // 'user', 'assistant', 'system'

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MessageContentDto)
    parts: MessageContentDto[] // Nội dung của message

    @IsOptional()
    metadata?: any // Metadata bổ sung
}

export class ChatRequestDto {
    @IsNotEmpty()
    id: string // ID của cuộc trò chuyện
    @IsArray()
    @IsNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => ChatMessageDto)
    messages: ChatMessageDto[] // Danh sách tin nhắn
    @IsOptional()
    trigger?: string
}
