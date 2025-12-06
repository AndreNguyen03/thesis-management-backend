import { Inject, Injectable } from '@nestjs/common'
import { StudentRegTopicRepositoryInterface } from '../repository/student-reg-topic.repository.interface';
import { LecturerRegTopicRepositoryInterface } from '../repository/lecturer-reg-topic.reposittory.interface';

@Injectable()
export class GetTopicIdsProvider {
    constructor(
        @Inject('StudentRegTopicRepositoryInterface')
        private readonly studentRegTopicRepository: StudentRegTopicRepositoryInterface,
        @Inject("LecturerRegTopicRepositoryInterface")
        private readonly lecturerRegTopicRepository: LecturerRegTopicRepositoryInterface
    ) {
        
    }
    async getTopicIdsOfLecturer(lecturerId: string): Promise<string[]> {
        const topicIds = await this.lecturerRegTopicRepository.getTopicIdsByLecturerId(lecturerId);
        return topicIds;
    }
    async getTopicIdsOfStudent(studentId: string): Promise<string[]> {
        const topicIds = await this.studentRegTopicRepository.getTopicIdsByStudentId(studentId);
        return topicIds;
    }
}
