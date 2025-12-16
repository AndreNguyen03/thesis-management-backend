import { IsOptional, IsString } from 'class-validator'

export class RejectTopicDto {
    @IsOptional()
    @IsString()
    note: string
    @IsOptional()
    topicIds: string[]
}
