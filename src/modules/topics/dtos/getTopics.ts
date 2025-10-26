import { Expose, Transform } from 'class-transformer'

export class GetTopicResponseDto {
    @Expose()
    _id: string

    @Expose()
    title: string

    @Expose()
    description: string

    @Expose()
    type: string

    @Expose()
    major: string

    @Expose()
    maxStudents: number

    @Expose()
    deadline: Date

    @Expose()
    createBy: string

    @Expose()
    createdAt: Date

    @Expose()
    updatedAt: Date

    @Expose()
    status: string
    //temp fields

    @Expose()
    fieldNames: string[]

    @Expose()
    requirementNames: string[]

    @Expose()
    studentNames: string[]

    @Expose()
    lecturerNames: string[]

    @Expose()
    isRegistered: boolean

    @Expose()
    isSaved: boolean
}

export class GetCancelRegisteredTopicResponseDto extends GetTopicResponseDto {
    @Expose()
    lastestCanceledRegisteredAt?: Date
}
