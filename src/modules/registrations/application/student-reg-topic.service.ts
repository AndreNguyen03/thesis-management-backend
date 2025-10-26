import { Inject, Injectable } from '@nestjs/common'
import { StudentRegTopicRepositoryInterface } from '../repository/student-reg-topic.repository.interface'

@Injectable()
export class StudentRegTopicService {
    constructor(
        @Inject('StudentRegTopicRepositoryInterface')
        private readonly studentRegTopicRepository: StudentRegTopicRepositoryInterface
    ) {}
    public createSingleRegistration(studentId: string, topicId: string) {
        return this.studentRegTopicRepository.createSingleRegistration(topicId, studentId)
    }
    public createRegistrationWithStudents(studentIds: string[], topicId: string) {
        return this.studentRegTopicRepository.createRegistrationWithStudents(topicId, studentIds)
    }

    public cancelRegistration(topicId: string, studentId: string) {
        return this.studentRegTopicRepository.cancelRegistration(topicId, studentId)
    }
}
