// dto/create-topic-interaction.dto.ts
import { IsEnum, IsString } from 'class-validator'

export enum TopicInteractionAction {
    VIEW = 'view',
    CLICK = 'click',
    BOOKMARK = 'bookmark',
    REGISTER = 'register'
}

export class CreateTopicInteractionDto {
    @IsString()
    topicId: string

    @IsEnum(TopicInteractionAction)
    action: TopicInteractionAction
}
