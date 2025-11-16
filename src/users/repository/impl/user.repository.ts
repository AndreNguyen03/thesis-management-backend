import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ClientSession, Model, Types } from 'mongoose'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { User } from '../../schemas/users.schema'
import { UserRepositoryInterface } from '../user.repository.interface'
import { HashingProvider } from '../../../auth/providers/hashing.provider'
import { UserRole } from '../../enums/user-role'
import { CreateUserDto } from '../../dtos/create-user.dto'

@Injectable()
export class UserRepository extends BaseRepositoryAbstract<User> implements UserRepositoryInterface {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
        private readonly hashingProvider: HashingProvider
    ) {
        super(userModel)
    }
   

    async findByEmail(email: string): Promise<User | null> {
        return this.userModel.findOne({ email, deleted_at: null }).exec()
    }

    async updatePassword(id: string, newHash: string): Promise<boolean> {
        const result = await this.userModel.updateOne({ _id: id, deleted_at: null }, { password_hash: newHash }).exec()
        return result.modifiedCount > 0
    }

    async createUser(dto: CreateUserDto, role: UserRole, options?: { session?: ClientSession }): Promise<User> {
        const passwordHash = await this.hashingProvider.hashPassword(dto.password)
        const user = new this.userModel({
            email: dto.email,
            password_hash: passwordHash,
            fullName: dto.fullName,
            phone: dto.phone,
            role: role,
            isActive: dto.isActive
        })
        return user.save({ session: options?.session })
    }

    async removeById(userId: string): Promise<{ deletedCount?: number }> {
        const objectId = new Types.ObjectId(userId)
        const result = await this.userModel.deleteOne({ _id: objectId })
        return { deletedCount: result.deletedCount }
    }
}
