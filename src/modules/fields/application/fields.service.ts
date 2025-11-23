import { Inject, Injectable } from '@nestjs/common'
import { Field } from '../schemas/fields.schemas'
import { Model } from 'mongoose'
import { InjectModel } from '@nestjs/mongoose'
import { IFieldsRepository } from '../repository/fields.repository.interface'
import { CreateFieldDto } from '../dtos/create-field.dto'
import { PaginationProvider } from '../../../common/pagination-an/providers/pagination.provider'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'

@Injectable()
export class FieldsService {
    constructor(
        @Inject('IFieldsRepository') private readonly fieldsRepository: IFieldsRepository,
    ) {}
    async getAllFields(query: PaginationQueryDto): Promise<Paginated<Field>> {
        return await this.fieldsRepository.getAllFields(query)
    }
    async createField(createFieldDto: CreateFieldDto): Promise<Field> {
        const newField = await this.fieldsRepository.createField(createFieldDto)
        return newField
    }
}
