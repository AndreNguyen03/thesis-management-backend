import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsEnum, IsNumber, IsArray } from 'class-validator'
import { Type } from 'class-transformer'
import { StandardStructureTopicDto } from '../../topics/dtos'
import { ChatbotUserRole } from '../enums/chatbot-user-role.enum'

export class TopicSnapshot {
    @IsNotEmpty()
    @IsString()
    _id: string
    @IsNotEmpty()
    @IsString()
    titleVN: string
    @IsNotEmpty()
    @IsString()
    titleEng: string
    @IsNotEmpty()
    @IsString()
    description: string
    @IsNotEmpty()
    @IsString()
    fields: string
    @IsNotEmpty()
    @IsString()
    requirements: string
    @IsNotEmpty()
    @IsString()
    major: string
    @IsNotEmpty()
    @IsString()
    lecturers: string
    @IsNotEmpty()
    @IsNumber()
    maxStudents: number
    @IsNotEmpty()
    @IsString()
    type: string
    @IsNotEmpty()
    @IsNumber()
    similarityScore: number
}

export class SendMessageDto {
    @IsNotEmpty()
    @IsString()
    @IsEnum(ChatbotUserRole)
    role: ChatbotUserRole

    @IsString()
    @IsNotEmpty()
    content: string

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TopicSnapshot)
    topics?: TopicSnapshot[]
}
