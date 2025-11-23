import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { LecturerRegisterTopic } from '../schemas/ref_lecturers_topics.schemas'

export interface LecturerRegTopicRepositoryInterface extends BaseRepositoryInterface<LecturerRegisterTopic> {
    createSingleRegistration(topicId: string, lecturerId: string): Promise<any>
    createRegistrationWithLecturers(userId: String, lecturerIds: string[], topicId: string): Promise<boolean>
    cancelRegistration(topicId: string, lecturerId: string): Promise<{ message: string }>
    checkFullSlot(topicId: string): Promise<boolean>
}
