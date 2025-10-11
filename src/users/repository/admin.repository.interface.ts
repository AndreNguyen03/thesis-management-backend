import { BaseRepositoryInterface } from '../../shared/base/repository/base.repository.interface'
import { Admin, AdminDocument } from '../schemas/admin.schema'

export interface AdminRepositoryInterface extends BaseRepositoryInterface<Admin> {
    findByEmail(email: string): Promise<AdminDocument | null>
    updatePassword(id: string, newHash: string): Promise<void>
}
