import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Field, FieldSchema } from '../../schemas/fields.schemas'
import { IFieldsRepository } from '../fields.repository.interface'
import { Model } from 'mongoose'
import { CreateFieldDto } from '../../dtos/create-field.dto'
import { BadRequestException } from '@nestjs/common'

export class FieldsRepository extends BaseRepositoryAbstract<Field> implements IFieldsRepository {
    constructor(@InjectModel(Field.name) private readonly fieldModel: Model<Field>) {
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
