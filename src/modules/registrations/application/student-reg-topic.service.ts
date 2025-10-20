import { Inject, Injectable } from '@nestjs/common'
import { StudentRegTopicRepositoryInterface } from '../repository/student-reg-topic.repository.interface'

@Injectable()
export class StudentRegTopicService {
    constructor(
        @Inject('StudentRegTopicRepositoryInterface')
        private readonly studentRegTopicRepository: StudentRegTopicRepositoryInterface
    ) {}
    public registerTopic(studentId: string, topicId: string) {
        return this.studentRegTopicRepository.createRegistration(topicId, studentId)
    }
    public getRegisteredTopics(studentId: string) {
        return this.studentRegTopicRepository.getRegisteredTopicsByUser(studentId)
    }
    public cancelRegistration(topicId: string, studentId: string) {
        return this.studentRegTopicRepository.cancelRegistration(topicId, studentId)
    }
    public getCanceledRegistrations(studentId: string) {
        return this.studentRegTopicRepository.getCanceledRegistrationByUser(studentId)
    }
}
