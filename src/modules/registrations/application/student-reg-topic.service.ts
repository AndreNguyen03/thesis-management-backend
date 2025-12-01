import { Inject, Injectable } from '@nestjs/common'
import { StudentRegTopicRepositoryInterface } from '../repository/student-reg-topic.repository.interface'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { StudentRegisterTopic } from '../schemas/ref_students_topics.schemas'
import { BodyReplyRegistrationDto } from '../dtos/query-reply-registration.dto'
import { UserRole } from '../../../users/enums/user-role'
import { StudentRegistrationStatus } from '../enum/student-registration-status.enum'
import { ActiveUserData } from '../../../auth/interface/active-user-data.interface'

@Injectable()
export class StudentRegTopicService {
    constructor(
        @Inject('StudentRegTopicRepositoryInterface')
        private readonly studentRegTopicRepository: StudentRegTopicRepositoryInterface
    ) {}
    //cả studentSignleRegistration và lecAssignStudent đều dùng hàm này createSingleRegistration
    public async studentSingleRegistration(actionRole: string, studentId: string, topicId: string) {
        return this.studentRegTopicRepository.createSingleRegistration(actionRole, studentId, topicId)
    }

    public async lecAssignStudent(studentId: string, topicId: string) {
        return this.studentRegTopicRepository.createSingleRegistration(UserRole.LECTURER, studentId, topicId)
    }
    //Giảng viên HD chính bỏ sinh viên ra khỏi đề tài
    public async unassignStudentInTopic(user: ActiveUserData, studentId: string, topicId: string) {
        //trong giai đoạn còn submitted hoặc draft mới được bỏ
        return this.studentRegTopicRepository.unassignStudentInTopic(user, topicId, studentId)
    }
    public createRegistrationWithStudents(studentIds: string[], topicId: string) {
        return this.studentRegTopicRepository.createRegistrationWithStudents(topicId, studentIds)
    }
    //sinh viên hủy đăng ký
    public cancelRegistration(topicId: string, studentId: string) {
        return this.studentRegTopicRepository.cancelRegistration(topicId, studentId)
    }
    public getStudentHistoryRegistrations(
        studentId: string,
        query: PaginationQueryDto
    ): Promise<Paginated<StudentRegisterTopic>> {
        return this.studentRegTopicRepository.getStudentRegistrationsHistory(studentId, query)
    }
    public async replyStudentRegistrationByLecturer(
        userId: string,
        registrationId: string,
        body: BodyReplyRegistrationDto
    ) {
        //gửi thông báo về cho sinh viên
        if (body.status === StudentRegistrationStatus.APPROVED) {
            //tùy thông tin gửi mail cho sinh viên dưới nội dung gì
            await this.studentRegTopicRepository.approvalStudentRegistrationByLecturer(
                userId,
                registrationId,
                body.studentRole,
                body.lecturerResponse
            )
        } else if (body.status === StudentRegistrationStatus.REJECTED) {
            //tùy thông tin gửi mail cho sinh viên dưới nội dung gì
            await this.studentRegTopicRepository.rejectStudentRegistrationByLecturer(
                userId,
                registrationId,
                body.rejectionReasonType,
                body.lecturerResponse
            )
        }
    }
}
