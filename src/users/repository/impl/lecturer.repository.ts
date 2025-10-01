import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as bcrypt from 'bcrypt'
import { BaseRepositoryAbstract } from 'src/shared/base/repository/base.repository.abstract'
import { Lecturer, LecturerDocument } from 'src/users/schemas/lecturer.schema'
import { LecturerRepositoryInterface } from '../lecturer.repository.interface'

@Injectable()
export class LecturerRepository extends BaseRepositoryAbstract<Lecturer> implements LecturerRepositoryInterface {
    constructor(@InjectModel(Lecturer.name) private readonly lecturerRepository: Model<Lecturer>) {
        super(lecturerRepository)
    }

    async findByEmail(email: string): Promise<LecturerDocument | null> {
        return this.lecturerRepository.findOne({ email, deleted_at: null }).exec()
    }

    async updatePassword(id: string, newHash: string): Promise<void> {
        await this.lecturerRepository.updateOne({ _id: id, deleted_at: null }, { password_hash: newHash }).exec()
    }
}
