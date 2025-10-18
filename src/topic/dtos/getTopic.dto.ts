import mongoose, { mongo } from 'mongoose'
import { TopicStatus } from '../enum/topic-status.enum'
import { IsEnum } from 'class-validator'
import { de } from '@faker-js/faker/.'
import { Exclude, Expose, Type } from 'class-transformer'

class RegistrantDto {
    @Expose()
    _id: string
    @Expose()
    fullName: string
    @Expose()
    role: string
}

class RegistrationItemDto {
    @Expose()
    _id: string
    @Expose()
    @Type(() => RegistrantDto)
    registrantId: RegistrantDto
    @Expose()
    registrantModel: string
}
export class GetTopicResponseDto {
    @Expose()
    _id: string
    @Expose()
    title: string
    @Expose()
    description: string
    @Expose()
    @Type(() => RegistrationItemDto)
    registrationIds: RegistrationItemDto[]
    @Expose()
    department: string
    @Expose()
    field: string
    @Expose()
    maxStudents: number
    @Expose()
    registeredStudents: number
    @Expose()
    deadline: Date
    @Expose()
    requirements: string[]
    @Expose()
    @IsEnum(TopicStatus)
    status: TopicStatus
    @Expose()
    rating: number
    @Expose()
    updatedAt: Date
    @Expose()
    createdAt: Date
    @Expose()
    isSaved: boolean
    @Expose()
    views: number
}
