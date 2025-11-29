import { Inject, Injectable } from '@nestjs/common'
import { StudentRegTopicRepositoryInterface } from '../repository/student-reg-topic.repository.interface'

@Injectable()
export class GetRegistrationInTopicProvider {
    constructor(
        @Inject('StudentRegTopicRepositoryInterface')
        private readonly studentRegTopicRepository: StudentRegTopicRepositoryInterface
    ) {}
    public getApprovedAndPendingStudentRegistrationsInTopic(topicId: string) {
        return this.studentRegTopicRepository.getApprovedAndPendingStudentRegistrationsInTopic(topicId)
    }
}
