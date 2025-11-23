import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { CreateFieldDto } from '../dtos/create-field.dto'
import { Field } from '../schemas/fields.schemas'

export interface IFieldsRepository extends BaseRepositoryInterface<Field> {
    createField(createFieldDto: CreateFieldDto): Promise<Field>
    getAllFields(query: PaginationQueryDto): Promise<Paginated<Field>>
}
