import { Expose } from 'class-transformer'

export class GetTopicResponseDto {
    @Expose()
    title: string
    @Expose()
    description: string

    @Expose()
    type: string

    @Expose()
    department: string
    @Expose()
    major: string

    @Expose()
    maxStudents: number

    @Expose()
    deadline: Date

    @Expose()
    referenceDocs: string[]

    @Expose()
    createBy: string

    @Expose()
    status: string

    @Expose()
    registeredStudents: number
}
