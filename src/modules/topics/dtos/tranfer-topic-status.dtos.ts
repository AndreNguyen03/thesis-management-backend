import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class WithDrawSubmittedTopicQuery {
    @IsString({ each: true })
    @IsNotEmpty()
    @IsArray()
    topicIds: string[]
}
