import { ActiveUserData } from '../../../auth/interface/active-user-data.interface'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { GetRegistrationDto } from '../../topics/dtos/registration/get-registration.dto'
import { GetStudentsRegistrationsInTopic } from '../../topics/dtos/registration/get-students-in-topic'
import { MetaCustom } from '../dtos/get-history-registration.dto'
import { PaginationStudentGetHistoryQuery } from '../dtos/request.dto'
import { StudentRegisterTopic } from '../schemas/ref_students_topics.schemas'

export interface StudentRegTopicRepositoryInterface extends BaseRepositoryInterface<StudentRegisterTopic> {
    createSingleRegistration(actionRole: string, studentId: string, topicId: string)
    createRegistrationWithStudents(topicId: string, studentIds: string[]): Promise<boolean>
    cancelRegistration(topicId: string, studentId: string): Promise<{ message: string }>
    unassignStudentInTopic(user: ActiveUserData, topicId: string, studentId: string): Promise<{ message: string }>
    getStudentRegistrationsHistory(
        studentId: string,
        query: PaginationStudentGetHistoryQuery
    ): Promise<{data: Paginated<StudentRegisterTopic>, meta: MetaCustom}>

    getApprovedAndPendingStudentRegistrationsInTopic(topicId: string): Promise<GetStudentsRegistrationsInTopic | null>
    approvalStudentRegistrationByLecturer(
        userId: string,
        registrationId: string,
        role: string,
        lecturerResponse: string
    )
    rejectStudentRegistrationByLecturer(
        userId: string,
        registrationId: string,
        reasonType: string,
        lecturerResponse: string
    )
    getTopicIdsByStudentId(studentId: string): Promise<string[]>
    deleteForceStudentRegistrationsInTopics(topicId: string[]): Promise<void>
    getParticipantsInTopic(topicId: string): Promise<string[]>
    getStudentTopicStateInPeriod(studentId: string)
}
