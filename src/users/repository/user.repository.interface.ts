import { ClientSession } from 'mongoose'
import { BaseRepositoryInterface } from '../../shared/base/repository/base.repository.interface'
import { CreateLecturerDto } from '../dtos/lecturer.dto'
import { User } from '../schemas/users.schema'
import { CreateStudentDto } from '../dtos/student.dto'
import { CreateUserDto } from '../dtos/create-user.dto'

export interface UserRepositoryInterface extends BaseRepositoryInterface<User> {
    findByEmail(email: string): Promise<User | null>
    updatePassword(id: string, newHash: string): Promise<boolean>
    createUser(dto: CreateUserDto, role: string, options?: { session?: ClientSession }): Promise<User>
    removeById(userId: string): Promise<{ deletedCount?: number }>
    getEmailListOfUsers(userIds: string[]): Promise<string[]>
    getEmailListFromLecturerInFaculty(facultyId: string): Promise<string[]>
    getEmailListFromStudentInFaculty(facultyId: string): Promise<string[]>
    getUsersByFacultyId(facultyId: string): Promise<User[]>
}
