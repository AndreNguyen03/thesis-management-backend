import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsEnum } from 'class-validator'
import { StandardStructureTopicDto } from '../../topics/dtos'
import { ChatbotUserRole } from '../enums/chatbot-user-role.enum'

export class SendMessageDto {
    @IsNotEmpty()
    @IsString()
    @IsEnum(ChatbotUserRole)
    role: ChatbotUserRole
    @IsString()
    @IsNotEmpty()
    content: string
    @IsOptional()
    @ValidateNested({ each: true })
    topics?: StandardStructureTopicDto[]
}
