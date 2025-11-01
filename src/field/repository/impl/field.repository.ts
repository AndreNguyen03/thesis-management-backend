import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { Field } from '../../schemas/field.schema'
import { FieldRepositoryInterface } from '../field.repository.interface'
import { Model } from 'mongoose'

export class FieldRepository extends BaseRepositoryAbstract<Field> implements FieldRepositoryInterface {
    constructor(
        @InjectModel(Field.name)
        private readonly fieldModel: Model<Field>
    ) {
        super(fieldModel)
    }

    async createMany(fields: Partial<Field>[]): Promise<boolean> {
        const result = await this.fieldModel.insertMany(fields)
        return result.length > 0
    }
}
