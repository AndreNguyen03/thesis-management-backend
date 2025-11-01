import { BaseRepositoryInterface } from '../../shared/base/repository/base.repository.interface'
import { Faculty } from '../schemas/faculty.schema'

export interface FacultyRepositoryInterface extends BaseRepositoryInterface<Faculty> {
    createMany(facultys: Partial<Faculty>[]): Promise<boolean>
}
