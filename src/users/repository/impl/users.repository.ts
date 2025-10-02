import { Injectable } from '@nestjs/common'
import { BaseRepositoryAbstract } from 'src/shared/base/repository/base.abstract.repository'
import { User } from '../../schemas/user.schema'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { UserRepositoryInterface } from '../users.repository.interface'

@Injectable()   
export class UsersRepository extends BaseRepositoryAbstract<User> implements UserRepositoryInterface {
    constructor(
        @InjectModel(User.name)
        private readonly usersRepository: Model<User>
    ) {
        super(usersRepository)
    }
    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOne({ email, deleted_at: null }).exec()
    }
    async updatePassword(userId: string, newPasswordHash: string): Promise<User | null> {
        const objectId = new Types.ObjectId(userId)
        return this.usersRepository.findByIdAndUpdate(objectId, { password_hash: newPasswordHash }, { new: true }).exec()
    }
}
