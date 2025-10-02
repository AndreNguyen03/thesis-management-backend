import { BaseRepositoryInterface } from 'src/shared/base/repository/base.repository.interface'
import { Student, StudentDocument } from '../schemas/student.schema'

export interface StudentRepositoryInterface extends BaseRepositoryInterface<Student> {
    findByEmail(email: string): Promise<StudentDocument | null>
    updatePassword(id: string, newHash: string): Promise<void>
}
