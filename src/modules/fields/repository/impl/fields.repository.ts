import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Field, FieldSchema } from '../../schemas/fields.schemas'
import { IFieldsRepository } from '../fields.repository.interface'
import { Model } from 'mongoose'
import { CreateFieldDto } from '../../dtos/create-field.dto'
import { BadRequestException } from '@nestjs/common'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { PaginationQueryDto } from '../../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'

export class FieldsRepository extends BaseRepositoryAbstract<Field> implements IFieldsRepository {
    constructor(
        @InjectModel(Field.name) private readonly fieldModel: Model<Field>,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(fieldModel)
    }
    async createField(createFieldDto: CreateFieldDto): Promise<Field> {
        const existingField = await this.fieldModel.findOne({ slug: createFieldDto.slug, deleted_at: null })
        if (existingField) {
            throw new BadRequestException('Lĩnh vực đã tồn tại')
        }
        const createdField = await this.fieldModel.create(createFieldDto)
        return createdField.save()
    }

    async getAllFields(query: PaginationQueryDto): Promise<Paginated<Field>> {
        const result = await this.paginationProvider.paginateQuery<Field>(query, this.fieldModel)
        return result
    }
}
