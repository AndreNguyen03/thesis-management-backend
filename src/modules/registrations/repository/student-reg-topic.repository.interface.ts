import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { GetRegistrationDto } from '../../topics/dtos/registration/get-registration.dto'
import { LecturerRegisterTopic } from '../schemas/ref_lecturers_topics.schemas'
import { StudentRegisterTopic } from '../schemas/ref_students_topics.schemas'

export interface StudentRegTopicRepositoryInterface extends BaseRepositoryInterface<StudentRegisterTopic> {
    createSingleRegistration(topicId: string, studentId: string): Promise<any>
    createRegistrationWithStudents(topicId: string, studentIds: string[]): Promise<string[]>
    getRegisteredTopicsByUser(userId: string): Promise<any>
    cancelRegistration(topicId: string, studentId: string): Promise<string>
    getCanceledRegistrationByUser(userId: string): Promise<any>
    checkFullSlot(maxStudents: number, topicId: string): Promise<boolean>
}
