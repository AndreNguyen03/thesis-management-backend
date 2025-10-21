import { Expose, Transform } from 'class-transformer'

export class GetTopicResponseDto {
    @Expose()
    _id:string
    @Expose()
    title: string
    @Expose()
    description: string

    @Expose()
    type: string

    @Expose({ name: 'major' })
    @Transform(({ obj }) => obj.majorId)
    major: string

    @Expose()
    maxStudents: number

    @Expose()
    deadline: Date

    // @Expose()
    // referenceDocs: string[]

    @Expose()
    createBy: string
    @Expose()
    createdAt: Date
    @Expose()
    updatedAt: Date
    @Expose()
    status: string

    @Expose()
    registeredStudents: number

    //temp fields
    @Expose()
    fieldNames: string[]
    @Expose()
    requirementNames: string[]
    @Expose()
    studentNames: string[]
    @Expose()
    lecturerNames: string[]
}
