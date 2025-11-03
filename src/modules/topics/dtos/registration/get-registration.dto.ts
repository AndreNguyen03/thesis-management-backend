import { RegistrationStatus } from '../../enum'
import { GetTopicResponseDto } from '../getTopics'
import { Expose, Type } from 'class-transformer'
@Expose()
export class GetRegistrationDto {
    @Expose()
    _id: string
    @Expose()
    @Type(() => GetTopicResponseDto)
    topic: GetTopicResponseDto
    @Expose()
    status: RegistrationStatus
    @Expose()
    createdAt: Date
    @Expose()
    updatedAt: Date
    @Expose()
    deleted_at?: Date | null
}
