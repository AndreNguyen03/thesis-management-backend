import { Inject, Injectable } from '@nestjs/common'
import { LecturerRegTopicRepository } from '../repository/impl/lecturer_reg_topic.repository'
import { CreateErrorException, DeleteErrorException, FullLecturerSlotException } from '../../../common/exceptions'
import { LecturerRegTopicRepositoryInterface } from '../repository/lecturer-reg-topic.reposittory.interface'
import { ActiveUserData } from '../../../auth/interface/active-user-data.interface'
import { User } from '../../../users/schemas/users.schema'

@Injectable()
export class LecturerRegTopicService {
    constructor(
        @Inject('LecturerRegTopicRepositoryInterface')
        private readonly lecturerRegTopicRepository: LecturerRegTopicRepositoryInterface
    ) {}

    public async createSingleRegistration(lecturerId: string, topicId: string) {
        const res = await this.lecturerRegTopicRepository.createSingleRegistration(topicId, lecturerId)
        return res
    }
    //giảng viên hướng dẫn chính xóa giảng viên khác khỏi đề tài
    public async unassignLecturerInTopic(user: ActiveUserData, lecturerId: string, topicId: string) {
        await this.lecturerRegTopicRepository.unassignLecturer(user, topicId, lecturerId)
    }

    public async createRegistrationWithLecturers(userId: String, lecturerIds: string[], topicId: string) {
        const res = await this.lecturerRegTopicRepository.createRegistrationWithLecturers(userId, lecturerIds, topicId)
        if (!res) {
            throw new CreateErrorException('topic')
        }
        return res
    }
    //giảng viên rút đăng ký của mình
    public async cancelRegistration(topicId: string, lecturerId: string) {
        const res = await this.lecturerRegTopicRepository.cancelRegistration(topicId, lecturerId)
        if (!res) {
            throw new DeleteErrorException('registration')
        }
    }

    //Xóa những đăng ký của giảng viên trong đề tài
    public async deleteForceLecturerRegistrationsInTopics(topicId: string[]) {
        await this.lecturerRegTopicRepository.deleteForceLecturerRegistrationsInTopics(topicId)
    }

    //Lấy thông tin của giảng viên hd chính
    public async getMainSupervisorInTopic(topicId: string): Promise<User | null> {
        return await this.lecturerRegTopicRepository.getMainSupervisorInTopic(topicId)
    }
    //Lấy thông tin của giảng viên đồng hướng dẫn
    public async getCoSupervisorsInTopic(topicId: string): Promise<User[] | null> {
        return await this.lecturerRegTopicRepository.getCoSupervisorsInTopic(topicId)
    }
}
