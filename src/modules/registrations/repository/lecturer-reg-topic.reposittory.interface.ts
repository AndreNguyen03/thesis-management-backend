import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { LecturerRegisterTopic } from '../schemas/ref_lecturers_topics.schemas'

export interface LecturerRegTopicRepositoryInterface extends BaseRepositoryInterface<LecturerRegisterTopic> {
    createSingleRegistration(topicId: string, lecturerId: string): Promise<any>
    createRegistrationWithLecturers(topicId: string, lecturerIds: string[]): Promise<string[]>
    getRegisteredTopicsByUser(lecturerId: string): Promise<any[]>
    cancelRegistration(topicId: string, lecturerId: string): Promise<string>
    getCanceledRegistrationByUser(lecturerId: string): Promise<any[]>
}
