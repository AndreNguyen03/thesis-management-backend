import { Expose, Type } from 'class-transformer'
import { ResponseMiniStudentDto } from '../../../../users/dtos/student.dto'

export class GetStudentsRegistrationsInTopic {
    @Expose()
    topicId: string
    @Expose()
    @Type(() => RegistrationDto)
    approvedStudents: RegistrationDto[]
    @Expose()
    @Type(() => RegistrationDto)
    pendingStudents: RegistrationDto[]
}

export class RegistrationDto {
    @Expose()
    _id: String
    @Expose()
    @Type(() => ResponseMiniStudentDto)
    student: ResponseMiniStudentDto
    @Expose()
    createdAt: Date
    @Expose()
    status: string
    @Expose()
    skills: string[]
}
