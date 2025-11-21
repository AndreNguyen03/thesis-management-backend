import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { GetRegistrationDto } from '../../topics/dtos/registration/get-registration.dto'
import { StudentRegisterTopic } from '../schemas/ref_students_topics.schemas'

export interface StudentRegTopicRepositoryInterface extends BaseRepositoryInterface<StudentRegisterTopic> {
    createSingleRegistration(studentId: string, topicId: string)
    createRegistrationWithStudents(topicId: string, studentIds: string[])
    cancelRegistration(topicId: string, studentId: string): Promise<{ message: string }>
    getStudentRegistrationsHistory(studentId: string, query: PaginationQueryDto): Promise<Paginated<StudentRegisterTopic>>
}
