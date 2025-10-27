import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Field, FieldSchema } from '../../schemas/fields.schemas'
import { IFieldsRepository } from '../fields.repository.interface'
import { Model } from 'mongoose'

export class FieldsRepository extends BaseRepositoryAbstract<Field> implements IFieldsRepository {
    constructor(@InjectModel(Field.name) private readonly fieldModel: Model<Field>) {
        super(fieldModel)
    }

    async getAllFields(): Promise<Field[]> {
        return this.fieldModel.aggregate([
            {
                $match: {
                    deleted_at: null
                }
            },
            { $project: { name: 1, slug: 1 } }
        ])
    }
}
