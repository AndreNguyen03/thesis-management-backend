import { ActiveUserData } from '../../../auth/interface/active-user-data.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { User } from '../../../users/schemas/users.schema'
import { LecturerRegisterTopic } from '../schemas/ref_lecturers_topics.schemas'

export interface LecturerRegTopicRepositoryInterface extends BaseRepositoryInterface<LecturerRegisterTopic> {
    createSingleRegistration(topicId: string, lecturerId: string): Promise<any>
    createRegistrationWithLecturers(userId: String, lecturerIds: string[], topicId: string): Promise<boolean>
    cancelRegistration(topicId: string, lecturerId: string)
    unassignLecturer(user: ActiveUserData, topicId: string, lecturerId: string)
    checkFullSlot(topicId: string): Promise<boolean>
    getTopicIdsByLecturerId(lecturerId: string): Promise<string[]>
    deleteForceLecturerRegistrationsInTopics(topicId: string[]): Promise<void>
    getCoSupervisorsInTopic(topicId: string): Promise<User[] | null>
    getMainSupervisorInTopic(topicId: string): Promise<User | null>
    getParticipantsInTopic(topicId: string): Promise<string[]>
}
