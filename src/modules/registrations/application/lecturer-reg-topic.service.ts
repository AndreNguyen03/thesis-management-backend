import { Inject, Injectable } from '@nestjs/common'
import { LecturerRegTopicRepository } from '../repository/impl/lecturer_reg_topic.repository'
import { CreateErrorException, DeleteErrorException } from '../../../common/exceptions'
import { LecturerRegTopicRepositoryInterface } from '../repository/lecturer-reg-topic.reposittory.interface'

@Injectable()
export class LecturerRegTopicService {
    constructor(
        @Inject('LecturerRegTopicRepositoryInterface')
        private readonly lecturerRegTopicRepository: LecturerRegTopicRepositoryInterface
    ) {}

    public async createSingleRegistration(lecturerId: string, topicId: string) {
        const res = await this.lecturerRegTopicRepository.createSingleRegistration(topicId, lecturerId)
        if (!res) {
            throw new CreateErrorException('topic')
        }
        return res
    }
    public async createRegistrationWithLecturers(lecturerIds: string[], topicId: string) {
        console.log('lecturerIds in service:', lecturerIds, topicId)
        const res = await this.lecturerRegTopicRepository.createRegistrationWithLecturers(topicId, lecturerIds)
        if (!res) {
            throw new CreateErrorException('topic')
        }
        return res
    }
    public getRegisteredTopics(lecturerId: string) {
        return this.lecturerRegTopicRepository.getRegisteredTopicsByUser(lecturerId)
    }
    public async cancelRegistration(topicId: string, studentId: string) {
        const res = await this.lecturerRegTopicRepository.cancelRegistration(topicId, studentId)
        if (!res) {
            throw new DeleteErrorException('registration')
        }
    }
    public async getCanceledRegistrations(lecturerId: string) {
        const res = await this.lecturerRegTopicRepository.getCanceledRegistrationByUser(lecturerId)
        if (!res) {
            throw new DeleteErrorException('registrations')
        }
    }
}
