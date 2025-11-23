import { ClientSession } from 'mongoose'
import { BaseRepositoryInterface } from '../../shared/base/repository/base.repository.interface'
import { CreateStudentDto, UpdateStudentProfileDto, UpdateStudentTableDto } from '../dtos/student.dto'
import { Student, StudentDocument } from '../schemas/student.schema'
import { Paginated } from '../../common/pagination-an/interfaces/paginated.interface'
import { PaginationQueryDto } from '../../common/pagination-an/dtos/pagination-query.dto'

export interface StudentRepositoryInterface extends BaseRepositoryInterface<Student> {
    findByEmail(email: string): Promise<StudentDocument | null>
    updatePassword(id: string, newHash: string): Promise<void>

    createStudent(userId: string, dto: CreateStudentDto, options?: { session?: ClientSession }): Promise<Student>

    getStudents(paginationQuery: PaginationQueryDto): Promise<Paginated<Student>>

    updateStudentByTable(id: string, dto: UpdateStudentTableDto): Promise<any>

    updateStudentProfile(userId: string, dto: UpdateStudentProfileDto): Promise<any>

    removeByUserId(userId: string): Promise<{ deletedCount?: number }>
    getById(id: string)
}
