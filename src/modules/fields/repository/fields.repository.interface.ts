import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { Field } from '../schemas/fields.schemas'

export interface IFieldsRepository extends BaseRepositoryInterface<Field> {
    getAllFields(): Promise<Field[]>
}
