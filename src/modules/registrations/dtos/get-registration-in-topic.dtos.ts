import { Expose } from 'class-transformer'

export class GetRegistrationInTopicDto {
    @Expose()
    _id: string
    @Expose()
    studentId: string
    @Expose()
    lecturerId: string
    @Expose()
    createdAt: Date
    @Expose()
    updatedAt: Date
    @Expose()
    deleted_at: Date
}
