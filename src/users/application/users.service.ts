import { Inject, Injectable } from '@nestjs/common'
import { UserRepositoryInterface } from '../repository/user.repository.interface'
import { BaseServiceAbstract } from '../../shared/base/service/base.service.abstract'
import { User } from '../schemas/users.schema'

@Injectable()
export class UserService extends BaseServiceAbstract<User> {
    constructor(
        @Inject('UserRepositoryInterface')
        private readonly userRepository: UserRepositoryInterface
    ) {
        super(userRepository)
    }

    async findByEmail(email: string): Promise<User | null> {
        return await this.userRepository.findByEmail(email)
    }

    async findById(id: string): Promise<User | null> {
        const user = await this.findOneById(id)
        return user
    }

    async updatePassword(id: string, newPasswordHash: string): Promise<boolean> {
        const result = await this.userRepository.updatePassword(id, newPasswordHash)
        return result
    }
}
