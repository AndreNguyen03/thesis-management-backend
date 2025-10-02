import { BaseRepositoryInterface } from 'src/shared/base/repository/base.interface.repository'
import type { User } from '../schemas/user.schema'

export interface UserRepositoryInterface extends BaseRepositoryInterface<User> {
    findByEmail(email: string): Promise<User | null>
    updatePassword(userId: string, newPasswordHash: string): Promise<User | null>
}
        