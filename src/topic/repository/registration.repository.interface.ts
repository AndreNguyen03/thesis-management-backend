import { BaseRepositoryInterface } from '../../shared/base/repository/base.repository.interface'
import { GetTopicResponseDto } from '../dtos'
import { GetRegistrationDto } from '../dtos/registration/get-registration.dto'
import { Registration } from '../schemas/registration.schema'

export interface RegistrationRepositoryInterface extends BaseRepositoryInterface<Registration> {
    createRegistration(topicId: string, userId: string, role: string): Promise<GetTopicResponseDto>
    getTopicRegistrationsByUser(userId: string, role: string): Promise<GetRegistrationDto[]>
    deleteRegistration(topicId: string, userId: string, role: string): Promise<Registration>
    getCanceledRegistrationByUser(userId: string, role: string): Promise<GetRegistrationDto[]>
}
