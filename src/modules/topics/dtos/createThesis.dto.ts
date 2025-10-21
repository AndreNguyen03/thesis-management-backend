import { IsNotEmpty, IsString } from 'class-validator'
import { TopicStatus } from '../enum/topic-status.enum'
import { IsOptional, IsNumber, IsDate, IsArray, IsEnum } from 'class-validator'
import { TopicType } from '../enum/topic-type.enum'
export class CreateTopicDto {
    @IsNotEmpty()
    @IsString()
    title: string

    @IsNotEmpty()
    @IsString()
    description: string

    @IsNotEmpty()
    @IsEnum(TopicType)
    type: TopicType

    @IsNotEmpty()
    majorId: string

    @IsNumber()
    maxStudents: number

    @IsString()
    @IsNotEmpty()
    createBy: string
    @IsOptional()
    deadline?: Date

    @IsOptional()
    @IsEnum(TopicStatus)
    status?: TopicStatus = TopicStatus.OPEN

    // @IsOptional()
    // @IsNumber()
    // rating?: number | 0 // 

    // @IsOptional()
    // @IsNumber()
    // views?: number | 0

    //temp fields
    @IsArray()
    fieldIds: string[] 

    @IsArray()
    @IsOptional()
    requirementIds?: string[] | []

    @IsArray()
    @IsOptional()
    studentIds?: string[] | []  

    @IsArray()
    @IsOptional()
    lecturerIds?: string[] | []
}
