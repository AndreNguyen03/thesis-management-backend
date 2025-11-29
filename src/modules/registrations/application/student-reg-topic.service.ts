import { Inject, Injectable } from '@nestjs/common'
import { StudentRegTopicRepositoryInterface } from '../repository/student-reg-topic.repository.interface'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { StudentRegisterTopic } from '../schemas/ref_students_topics.schemas'
import { CheckAllowManualApprovalProvider } from '../../topics/providers/check-allow-manual-approval.provider'
import { RegistrationStatus } from '../../topics/enum'
import { BodyReplyRegistrationDto } from '../dtos/query-reply-registration.dto'

@Injectable()
export class StudentRegTopicService {
    constructor(
        @Inject('StudentRegTopicRepositoryInterface')
        private readonly studentRegTopicRepository: StudentRegTopicRepositoryInterface,
        private readonly checkAllowManualApprovalProvider: CheckAllowManualApprovalProvider
    ) {}
    public async createSingleRegistration(studentId: string, topicId: string) {
        const allowManualApproval = await this.checkAllowManualApprovalProvider.checkAllowManualApproval(topicId)
        return this.studentRegTopicRepository.createSingleRegistration(studentId, topicId, allowManualApproval)
    }
    public createRegistrationWithStudents(studentIds: string[], topicId: string) {
        return this.studentRegTopicRepository.createRegistrationWithStudents(topicId, studentIds)
    }

    public cancelRegistration(topicId: string, studentId: string) {
        return this.studentRegTopicRepository.cancelRegistration(topicId, studentId)
    }
    public getStudentHistoryRegistrations(
        studentId: string,
        query: PaginationQueryDto
    ): Promise<Paginated<StudentRegisterTopic>> {
        return this.studentRegTopicRepository.getStudentRegistrationsHistory(studentId, query)
    }
    public async replyStudentRegistrationByLecturer(registrationId: string, body: BodyReplyRegistrationDto) {
        //gửi thông báo về cho sinh viên
        if (body.status === RegistrationStatus.APPROVED) {
            //tùy thông tin gửi mail cho sinh viên dưới nội dung gì
            await this.studentRegTopicRepository.approvalStudentRegistrationByLecturer(
                registrationId,
                body.status,
                body.studentRole,
                body.lecturerResponse
            )
        } else if (body.status === RegistrationStatus.REJECTED) {
            //tùy thông tin gửi mail cho sinh viên dưới nội dung gì
            await this.studentRegTopicRepository.rejectStudentRegistrationByLecturer(
                registrationId,
                body.rejectionReasonType,
                body.lecturerResponse
            )
        }
    }
}
