import { BaseRepositoryInterface } from '../../shared/base/repository/base.repository.interface'
import { Major } from '../schemas/major.schema'

export interface MajorRepositoryInterface extends BaseRepositoryInterface<Major> {
    createMany(Majors: Partial<Major>[]): Promise<boolean>
}
