import { IsArray, IsEnum, IsMongoId, IsOptional, IsString } from "class-validator"
import { RecipientType } from "../enum/recipient-type.enum"
import { RecipientMode } from "../../../mail/dtos/send-data.dtos"

export class SendCustomNotificationDto {
    @IsMongoId()
    periodId: string

    @IsEnum(RecipientMode)
    recipientType: RecipientMode

    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    recipientIds?: string[]

    @IsString()
    subject: string

    @IsString()
    content: string

    @IsOptional()
    @IsString()
    templateId?: string
}
