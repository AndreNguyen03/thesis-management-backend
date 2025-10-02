import { BadRequestException, Injectable, RequestTimeoutException, Inject } from '@nestjs/common'
import { User } from '../schemas/user.schema'
import { CreateUserDto } from '../dtos/create-user.dto'
import { UserRepositoryInterface } from '../repository/users.repository.interface'
import { BaseServiceAbstract } from 'src/shared/base/service/base.abstract.service'

@Injectable()
export class UsersService extends BaseServiceAbstract<User> {
    constructor(
        @Inject('UserRepositoryInterface')
        private readonly usersRepository: UserRepositoryInterface
    ) {
        super(usersRepository)
    }

    /**
     * Tìm user theo _id (ẩn password_hash)
     */
    public async findOneById(userId: string): Promise<User> {
        let user: User | null = null

        try {
            user = await this.usersRepository.findOneById(userId, '-password_hash')
        } catch (error) {
            throw new RequestTimeoutException('Unable to process your request at the moment, please try again later', {
                description: 'Error connecting to the database'
            })
        }

        if (!user) {
            throw new BadRequestException('The user id does not exist')
        }

        return user
    }

    /**
     * Tìm user theo email
     */
    public async findOneByEmail(email: string): Promise<User> {
        const user = await this.usersRepository.findByEmail(email)

        if (!user) {
            throw new BadRequestException('The email does not exist')
        }

        return user
    }

    /**
     * Tạo user
     */

    public async createUser(createUserDto: CreateUserDto): Promise<User> {
        return this.create(createUserDto) 
    }

    /**
     * Cập nhật mật khẩu user
     */
    public async updatePassword(userId: string, newPasswordHash: string): Promise<User> {
        const updated = await this.usersRepository.updatePassword(userId, newPasswordHash)
        console.log(updated)
        if (!updated) {
            throw new BadRequestException('Failed to update password')
        }
        return updated
    }
}
