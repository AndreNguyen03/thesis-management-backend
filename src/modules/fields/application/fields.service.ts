import { Inject, Injectable } from '@nestjs/common'
import { Field } from '../schemas/fields.schemas'
import { Model } from 'mongoose'
import { InjectModel } from '@nestjs/mongoose'
import { IFieldsRepository } from '../repository/fields.repository.interface'

@Injectable()
export class FieldsService {
    constructor(@Inject('IFieldsRepository') private readonly fieldsRepository: IFieldsRepository) {}
    async getAllFields(): Promise<Field[]> {
        const fields = await this.fieldsRepository.getAllFields()
        return fields
    }
}
