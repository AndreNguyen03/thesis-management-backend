import { IsArray, IsNotEmpty, IsString } from 'class-validator'

export class CreateRefFieldsTopicDto {
    @IsNotEmpty()
    @IsString()
    topicId: string
    @IsArray()
    @IsNotEmpty()
    @IsString({ each: true })
    fieldIds: string[]
}
