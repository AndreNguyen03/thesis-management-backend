import { IsEnum, IsOptional, IsString } from 'class-validator'
import { RegistrationStatus } from '../../enum'

export class ReplyRegistrationDto {
    @IsString()
    thesisId: string

    @IsEnum(RegistrationStatus)
    status: RegistrationStatus

    @IsOptional()
    @IsString()
    message?: string
}
