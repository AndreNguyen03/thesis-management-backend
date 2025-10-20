import { Inject, Injectable } from '@nestjs/common'
import { LecturerRegTopicRepository } from '../repository/impl/lecturer_reg_topic.repository'

@Injectable()
export class LecturerRegTopicService {
    constructor(
        @Inject('LecturerRegTopicRepositoryInterface')
        private readonly lecturerRegTopicRepository: LecturerRegTopicRepository
    ) {}

    public async registerTopic(lecturerId: string, topicId: string) {
        return this.lecturerRegTopicRepository.createRegistration(topicId, lecturerId)
    }
    public getRegisteredTopics(lecturerId: string) {
        return this.lecturerRegTopicRepository.getRegisteredTopicsByUser(lecturerId)
    }
    public cancelRegistration(topicId: string, studentId: string) {
        return this.lecturerRegTopicRepository.cancelRegistration(topicId, studentId)
    }
    public getCanceledRegistrations(lecturerId: string) {
        return this.lecturerRegTopicRepository.getCanceledRegistrationByUser(lecturerId)
    }
}
