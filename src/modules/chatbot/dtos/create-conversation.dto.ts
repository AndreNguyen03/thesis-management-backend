import { IsString, IsOptional } from 'class-validator'

export class CreateConversationDto {
    @IsString()
    @IsOptional()
    title?: string = 'Chat mới'

    @IsString()
    @IsOptional()
    initialMessage?: string
}
