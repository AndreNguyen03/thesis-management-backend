import { InjectModel } from '@nestjs/mongoose'
import { RefFieldTopics } from '../../schemas/ref_fields_topics.schemas'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { IRefFieldsTopicsRepository } from '../ref-requirement-topics.repository.interface'
import { RefRequirementTopics } from '../../../ref_requirements_topics/schemas/ref_requirement_topics.schemas'
import mongoose, { Model, mongo } from 'mongoose'

export class RefFieldTopicsRepository
    extends BaseRepositoryAbstract<RefFieldTopics>
    implements IRefFieldsTopicsRepository
{
    constructor(@InjectModel(RefFieldTopics.name) private readonly refFieldsTopics: Model<RefFieldTopics>) {
        super(refFieldsTopics)
    }
    createWithFieldIds(topicId: string, fieldIds: string[]): Promise<RefFieldTopics[]> {
        return this.refFieldsTopics.insertMany(
            fieldIds.map((fieldId) => ({
                topicId: new mongoose.Schema.Types.ObjectId(topicId),
                fieldId: new mongoose.Schema.Types.ObjectId(fieldId)
            }))
        )
    }
    deleteManyByFieldIdsAndTopicId(topicId: string, fieldIds: string[]): Promise<any> {
        return this.refFieldsTopics.deleteMany({ topicId, fieldId: { $in: fieldIds } }).exec()
    }

    deleteManyByTopicId(topicId: string): Promise<any> {
        return this.refFieldsTopics.deleteMany({ topicId }).exec()
    }
}
