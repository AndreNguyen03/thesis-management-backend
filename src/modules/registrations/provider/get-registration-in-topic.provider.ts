import { Inject, Injectable } from '@nestjs/common'
import { StudentRegTopicRepositoryInterface } from '../repository/student-reg-topic.repository.interface'
import { LecturerRegTopicRepositoryInterface } from '../repository/lecturer-reg-topic.reposittory.interface'

@Injectable()
export class GetRegistrationInTopicProvider {
    constructor(
        @Inject('StudentRegTopicRepositoryInterface')
        private readonly studentRegTopicRepository: StudentRegTopicRepositoryInterface,
        @Inject('LecturerRegTopicRepositoryInterface')
        private readonly lecturerRegTopicRepository: LecturerRegTopicRepositoryInterface
    ) {}
    public getApprovedAndPendingStudentRegistrationsInTopic(topicId: string) {
        return this.studentRegTopicRepository.getApprovedAndPendingStudentRegistrationsInTopic(topicId)
    }
    public async getParticipantsInTopic(topicId: string): Promise<string[]> {
        const students = await this.studentRegTopicRepository.getParticipantsInTopic(topicId)
        const lecturers = await this.lecturerRegTopicRepository.getParticipantsInTopic(topicId)
        return [...students, ...lecturers]
    }
}
