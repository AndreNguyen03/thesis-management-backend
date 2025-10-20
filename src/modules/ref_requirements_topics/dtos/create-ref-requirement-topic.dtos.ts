import { IsArray, IsNotEmpty, IsString } from 'class-validator'

export class CreateRefRequirementsTopicDto {
    @IsNotEmpty()
    @IsString()
    topicId: string
    @IsNotEmpty()
    @IsArray()
    @IsString({ each: true })
    requirementId: string[]
}
