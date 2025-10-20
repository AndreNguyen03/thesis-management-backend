import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { GetRegistrationDto } from '../../topics/dtos/registration/get-registration.dto'
import { LecturerRegisterTopic } from '../schemas/ref_lecturers_topics.schemas'
import { StudentRegisterTopic } from '../schemas/ref_students_topics.schemas'

export interface StudentRegTopicRepositoryInterface extends BaseRepositoryInterface<StudentRegisterTopic> {
    createRegistration(topicId: string, studentId: string): Promise<any>
    getRegisteredTopicsByUser(userId: string): Promise<any>
    cancelRegistration(topicId: string, studentId: string): Promise<string>
    getCanceledRegistrationByUser(userId: string): Promise<any>
}
