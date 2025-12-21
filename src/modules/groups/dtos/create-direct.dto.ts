import { IsOptional, IsString } from 'class-validator'

export class CreateDirectGroupDto {
    @IsString()
    targetUserId: string

    @IsOptional()
    @IsString()
    topicId?: string
}
