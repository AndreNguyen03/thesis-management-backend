import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as bcrypt from 'bcrypt'
import { AdminRepositoryInterface } from '../admin.repository.interface'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { Admin, AdminDocument } from '../../schemas/admin.schema'

@Injectable()
export class AdminRepository extends BaseRepositoryAbstract<Admin> implements AdminRepositoryInterface {
    constructor(@InjectModel(Admin.name) private readonly adminModel: Model<Admin>) {
        super(adminModel)
    }

    async findByEmail(email: string): Promise<AdminDocument | null> {
        return this.adminModel.findOne({ email, deleted_at: null }).exec()
    }

    async updatePassword(id: string, newHash: string): Promise<void> {
        await this.adminModel.updateOne({ _id: id, deleted_at: null }, { password_hash: newHash }).exec()
    }
}
