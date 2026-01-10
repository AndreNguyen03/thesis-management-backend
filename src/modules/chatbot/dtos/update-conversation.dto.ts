import { IsString, IsOptional, IsEnum } from 'class-validator'

export class UpdateConversationDto {
    @IsString()
    @IsOptional()
    title?: string

    @IsEnum(['active', 'archived'])
    @IsOptional()
    status?: 'active' | 'archived'
}
