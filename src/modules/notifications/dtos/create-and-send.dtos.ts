import { IsNotEmpty, IsOptional } from 'class-validator'

export class CreateNotification {
    @IsNotEmpty()
    recipientId: string
    @IsNotEmpty()
    senderId?: string
    @IsNotEmpty()
    title: string
    @IsNotEmpty()
    message: string
    @IsNotEmpty()
    isRead: boolean = false
    @IsOptional()
    metadata?: Record<string, any>
    @IsNotEmpty()
    type: string
}
