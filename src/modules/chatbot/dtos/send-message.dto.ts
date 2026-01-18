import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsEnum, IsNumber, IsArray } from 'class-validator'
import { Expose, Type } from 'class-transformer'
import { StandardStructureTopicDto } from '../../topics/dtos'
import { ChatbotUserRole } from '../enums/chatbot-user-role.enum'
import { LecturerKnowledgeDto, PublicationDto } from './get-enough-knowledge-result.dto'
import { GetFacultyDto } from '../../faculties/dtos/faculty.dtos'
import { Optional } from '@nestjs/common'

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
    @IsOptional()
    @IsString()
    fields: string
    @IsOptional()
    @IsString()
    requirements: string
    @IsOptional()
    @IsString()
    major: string
    @IsOptional()
    @IsString()
    lecturers: string
    @IsOptional()
    @IsNumber()
    maxStudents: number
    @IsNotEmpty()
    @IsString()
    type: string
    @IsNotEmpty()
    @IsNumber()
    similarityScore: number
}

export class LecturerSnapshot {
    @Expose()
    @IsNotEmpty()
    @IsString()
    _id: string
    @Expose()
    @IsNotEmpty()
    @IsString()
    fullName: string
    @IsOptional()
    @IsString()
    @Expose()
    email: string
    @IsOptional()
    @Expose()
    bio?: string
    @IsNotEmpty()
    @IsString()
    @Expose()
    title: string
    @IsNotEmpty()
    @Type(() => GetFacultyDto)
    @Expose()
    faculty: GetFacultyDto
    @IsOptional()
    @Expose()
    areaInterest: string[]
    @Expose()
    @IsOptional()
    researchInterests: string[]
    @Expose()
    @IsOptional()
    publications: PublicationDto[]
    @IsNotEmpty()
    @Expose()
    @IsNumber()
    similarityScore: number
    @IsOptional()
    @Expose()
    @IsString()
    matchReason?: string
    @IsOptional()
    @Expose()
    @IsString()
    matchType?: string
    @IsOptional()
    @Expose()
    scores?: {
        name?: number
        semantic?: number
        combined?: number
        rerank?: number
    }
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

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LecturerSnapshot)
    lecturers?: LecturerSnapshot[]
}
