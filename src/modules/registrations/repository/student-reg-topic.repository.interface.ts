import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { GetRegistrationDto } from '../../topics/dtos/registration/get-registration.dto'
import { GetStudentsRegistrationsInTopic } from '../../topics/dtos/registration/get-students-in-topic'
import { StudentRegisterTopic } from '../schemas/ref_students_topics.schemas'

export interface StudentRegTopicRepositoryInterface extends BaseRepositoryInterface<StudentRegisterTopic> {
    createSingleRegistration(studentId: string, topicId: string, allowManualApproval: boolean)
    createRegistrationWithStudents(topicId: string, studentIds: string[]): Promise<boolean>
    cancelRegistration(topicId: string, studentId: string): Promise<{ message: string }>
    getStudentRegistrationsHistory(
        studentId: string,
        query: PaginationQueryDto
    ): Promise<Paginated<StudentRegisterTopic>>

    getApprovedAndPendingStudentRegistrationsInTopic(topicId: string): Promise<GetStudentsRegistrationsInTopic | null>
    approvalStudentRegistrationByLecturer(
        userId: string,
        registrationId: string,
        role: string,
        lecturerResponse: string
    )
    rejectStudentRegistrationByLecturer(registrationId: string, reasonType: string, lecturerResponse?: string)
}
