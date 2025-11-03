import { Inject, Injectable } from '@nestjs/common'
import { Field } from '../schemas/fields.schemas'
import { Model } from 'mongoose'
import { InjectModel } from '@nestjs/mongoose'
import { IFieldsRepository } from '../repository/fields.repository.interface'
import { CreateFieldDto } from '../dtos/create-field.dto'

@Injectable()
export class FieldsService {
    constructor(@Inject('IFieldsRepository') private readonly fieldsRepository: IFieldsRepository) {}
    async getAllFields(): Promise<Field[]> {
        const fields = await this.fieldsRepository.getAllFields()
        return fields
    }
    async createField(createFieldDto: CreateFieldDto): Promise<Field> {
        const newField = await this.fieldsRepository.createField(createFieldDto)
        return newField
    }
}
