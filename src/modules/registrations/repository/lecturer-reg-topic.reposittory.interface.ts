import { BaseRepositoryInterface } from "../../../shared/base/repository/base.repository.interface"
import { LecturerRegisterTopic } from "../schemas/ref_lecturers_topics.schemas"

export interface LecturerRegTopicRepositoryInterface extends BaseRepositoryInterface<LecturerRegisterTopic> {
    createRegistration(topicId: string, lecturerId: string, role: string): Promise<any>
    getRegisteredTopicsByUser(lecturerId: string, role: string): Promise<any[]>
    cancelRegistration(topicId: string, lecturerId: string): Promise<string>
    getCanceledRegistrationByUser(lecturerId: string, role: string): Promise<any[]>
}
