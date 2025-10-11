import { BaseRepositoryInterface } from '../../shared/base/repository/base.repository.interface'
import { Lecturer, LecturerDocument } from '../schemas/lecturer.schema'

export interface LecturerRepositoryInterface extends BaseRepositoryInterface<Lecturer> {
    findByEmail(email: string): Promise<LecturerDocument | null>
    updatePassword(id: string, newHash: string): Promise<void>
}
