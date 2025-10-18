import { Prop } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { RegistrationStatus } from '../../enum'
import { TopicDto } from '../../../users/dtos/lecturer.dto'
import { GetTopicResponseDto } from '../getTopic.dto'
import { Expose, Type } from 'class-transformer'
@Expose()
export class GetRegistrationDto {
    @Expose()
    _id: string
    @Expose()
    @Type(() => GetTopicResponseDto)
    Topic: GetTopicResponseDto
    @Expose()
    status: RegistrationStatus
    @Expose()
    createdAt: Date
    @Expose()
    updatedAt: Date
    @Expose()
    deleted_at?: Date | null
}
