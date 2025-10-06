import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as bcrypt from 'bcrypt'
import { StudentRepositoryInterface } from '../student.repository.interface'
import { Student, StudentDocument } from '../../schemas/student.schema'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'

@Injectable()
export class StudentRepository extends BaseRepositoryAbstract<Student> implements StudentRepositoryInterface {
    constructor(@InjectModel(Student.name) private readonly studentRepository: Model<Student>) {
        super(studentRepository)
    }

    async findByEmail(email: string): Promise<StudentDocument | null> {
        return this.studentRepository.findOne({ email, deleted_at: null }).exec()
    }

    async updatePassword(id: string, newHash: string): Promise<void> {
        await this.studentRepository.updateOne({ _id: id, deleted_at: null }, { password_hash: newHash }).exec()
    }
}
