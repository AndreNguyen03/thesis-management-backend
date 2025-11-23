import { IsNotEmpty } from 'class-validator'

export class SubmitTopicDto {
    @IsNotEmpty()
    topicId: string
    @IsNotEmpty()
    periodId: string
}
