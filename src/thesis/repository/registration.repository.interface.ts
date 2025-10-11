import { BaseRepositoryInterface } from '../../shared/base/repository/base.repository.interface'
import { GetThesisResponseDto } from '../dtos'
import { GetRegistrationDto } from '../dtos/registration/get-registration.dto'
import { Registration } from '../schemas/registration.schema'
import { Thesis } from '../schemas/thesis.schemas'

export interface RegistrationRepositoryInterface extends BaseRepositoryInterface<Registration> {
    createRegistration(thesisId: string, userId: string, role: string): Promise<GetThesisResponseDto>
    getThesisRegistrationsByUser(userId: string, role: string): Promise<GetRegistrationDto[]>
    deleteRegistration(thesisId: string, userId: string, role: string): Promise<Registration>
    getCanceledRegistrationByUser(userId: string, role: string): Promise<GetRegistrationDto[]>
}
