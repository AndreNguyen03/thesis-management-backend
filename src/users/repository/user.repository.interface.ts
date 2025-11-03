import { ClientSession } from 'mongoose'
import { BaseRepositoryInterface } from '../../shared/base/repository/base.repository.interface'
import { CreateLecturerDto } from '../dtos/lecturer.dto'
import { User } from '../schemas/users.schema'
import { CreateStudentDto } from '../dtos/student.dto'

export interface UserRepositoryInterface extends BaseRepositoryInterface<User> {
    findByEmail(email: string): Promise<User | null>
    updatePassword(id: string, newHash: string): Promise<boolean>
    createLecturerUser(dto: CreateLecturerDto, options?: { session?: ClientSession }): Promise<User>
    createStudentUser(dto: CreateStudentDto, options?: { session?: ClientSession }): Promise<User>

    removeById(userId: string): Promise<{ deletedCount?: number }>
}
