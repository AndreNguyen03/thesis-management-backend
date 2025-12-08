import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { StudentRegTopicRepositoryInterface } from '../repository/student-reg-topic.repository.interface'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { RejectionReasonType, StudentRegisterTopic } from '../schemas/ref_students_topics.schemas'
import { BodyReplyRegistrationDto } from '../dtos/query-reply-registration.dto'
import { UserRole } from '../../../users/enums/user-role'
import { StudentRegistrationStatus } from '../enum/student-registration-status.enum'
import { ActiveUserData } from '../../../auth/interface/active-user-data.interface'
import { NotificationPublisherService } from '../../notifications/publisher/notification.publisher.service'
import mongoose from 'mongoose'
import { NotificationType } from '../../notifications/schemas/notification.schemas'
import { getRejectionReasonText } from '../../../common/utils/translate-code-to-semantic-text'
import { GetMiniTopicInfoProvider } from '../../topics/providers/get-mini-topic-info.provider'
import { CheckUserInfoProvider } from '../../../users/provider/check-user-info.provider'

@Injectable()
export class StudentRegTopicService {
    constructor(
        @Inject('StudentRegTopicRepositoryInterface')
        private readonly studentRegTopicRepository: StudentRegTopicRepositoryInterface,
        private readonly notificationPublisherService: NotificationPublisherService,
        private readonly getMiniTopicInfoProvider: GetMiniTopicInfoProvider,
        private readonly checkUserInfoProvider: CheckUserInfoProvider
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
        //lấy meta data
        //Lấy thông tin của người nhận thông báo từ registrationId
        const registration = await this.studentRegTopicRepository.findOneByCondition({
            _id: new mongoose.Types.ObjectId(registrationId),
            status: StudentRegistrationStatus.PENDING,
            deleted: null
        })
        if (!registration) {
            throw new BadRequestException('Đăng ký không tồn tại')
        }
        const topicInfo = await this.getMiniTopicInfoProvider.getMiniTopicInfo(registration.topicId)

        //gửi thông báo về cho sinh viên
        if (body.status === StudentRegistrationStatus.APPROVED) {
            await this.studentRegTopicRepository.approvalStudentRegistrationByLecturer(
                userId,
                registrationId,
                body.studentRole,
                body.lecturerResponse
            )

            //Gửi thông báo cho sinh viên về việc đồng ý đăng ký
            await this.notificationPublisherService.sendApprovedRegisterationNotification(
                registration.userId,
                userId,
                topicInfo
            )
        } else if (body.status === StudentRegistrationStatus.REJECTED) {
            await this.studentRegTopicRepository.rejectStudentRegistrationByLecturer(
                userId,
                registrationId,
                body.rejectionReasonType,
                body.lecturerResponse
            )
            const lecturerInfo = await this.checkUserInfoProvider.getUserInfo(userId)
            //Gửi thông báo cho sinh viên về việc từ chối đăng ký
            await this.notificationPublisherService.sendRejectedRegisterationNotification(
                registration.userId,
                lecturerInfo,
                topicInfo,
                body,
                
            )
        }
    }
    //Xóa những đăng ký của giảng viên trong đề tài
    public async deleteForceStudentRegistrationsInTopics(topicIds: string[]) {
        await this.studentRegTopicRepository.deleteForceStudentRegistrationsInTopics(topicIds)
    }
}
