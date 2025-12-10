import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export enum RecipientMode {
    CUSTOM_INSTRUCTORS = 'custom-instructors',
    ALL_STUDENTS = 'all-students',
    ALL_INSTRUCTORS = 'all-instructors'
}
export class SendData {
    @IsEnum(RecipientMode)
    @IsNotEmpty()
    recipientMode: RecipientMode
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    recipients: string[]
    @IsNotEmpty()
    subject: string
    @IsNotEmpty()
    content: string
}
