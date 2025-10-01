import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as bcrypt from 'bcrypt'
import { AdminRepositoryInterface } from '../admin.repository.interface'
import { Admin, AdminDocument } from 'src/users/schemas/admin.schema'
import { BaseRepositoryAbstract } from 'src/shared/base/repository/base.repository.abstract'

@Injectable()
export class AdminRepository extends BaseRepositoryAbstract<Admin> implements AdminRepositoryInterface {
    constructor(@InjectModel(Admin.name) private readonly adminRepository: Model<Admin>) {
        super(adminRepository)
    }

    async findByEmail(email: string): Promise<AdminDocument | null> {
        return this.adminRepository.findOne({ email, deleted_at: null }).exec()
    }

    async updatePassword(id: string, newHash: string): Promise<void> {
        await this.adminRepository.updateOne({ _id: id, deleted_at: null }, { password_hash: newHash }).exec()
    }
}
