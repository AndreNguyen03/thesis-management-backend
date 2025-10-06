import { BaseRepositoryInterface } from '../../shared/base/repository/base.repository.interface'
import { GetThesisResponseDto } from '../dtos'
import { Thesis } from '../schemas/thesis.schemas'

export interface ThesisRepositoryInterface extends BaseRepositoryInterface<Thesis> {
    studentRegisterThesis(studentId: string, thesisId: string): Promise<Thesis | null>
    studentGetRegisteredThesis(studentId: string): Promise<Thesis[]>
    getAllTheses(): Promise<GetThesisResponseDto[]>
    findSavedByUser(userId: string, role: string): Promise<GetThesisResponseDto[]>
    saveThesis(userId: string, role: string, thesisId: string)
    
}
