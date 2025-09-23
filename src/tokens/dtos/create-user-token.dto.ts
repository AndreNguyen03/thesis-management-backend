// src/modules/user-tokens/dto/create-user-token.dto.ts
import { IsString, IsOptional, IsDate, IsNotEmpty } from 'class-validator'

export class CreateUserTokenDto {
    @IsString()
    @IsNotEmpty()
    userId: string

    @IsString()
    @IsNotEmpty()
    deviceId: string

    @IsString()
    @IsNotEmpty()
    refreshToken: string

    @IsString()
    @IsOptional()
    deviceInfo?: string

    @IsString()
    @IsOptional()
    ipAddress?: string

    @IsOptional()
    @IsDate()
    expiresAt?: Date
}
