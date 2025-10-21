import { InjectModel } from '@nestjs/mongoose'
import { RefFieldTopics } from '../../schemas/ref_fields_topics.schemas'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { IRefFieldsTopicsRepository } from '../ref-fields-topics.repository.interface'
import { Model } from 'mongoose'

export class RefFieldTopicsRepository
    extends BaseRepositoryAbstract<RefFieldTopics>
    implements IRefFieldsTopicsRepository
{
    constructor(@InjectModel(RefFieldTopics.name) private readonly refFieldsTopics: Model<RefFieldTopics>) {
        super(refFieldsTopics)
    }
    async createWithFieldIds(topicId: string, fieldIds: string[]): Promise<string[]> {
        const docs = await this.refFieldsTopics.insertMany(
            fieldIds.map((fieldId) => ({
                topicId,
                fieldId
            }))
        )
        const populated = await this.refFieldsTopics.populate(docs, {
            path: 'fieldId',
            select: 'name'
        })
        const res = populated
            .map((d: any) => (d.toObject ? d.toObject() : d)) // chuyển về plain object nếu là doc
            .map((d: any) => d.fieldId?.name)
            .filter(Boolean) as string[]
        return res
    }
    async deleteManyByFieldIdsAndTopicId(topicId: string, fieldIds: string[]): Promise<any> {
        return await this.refFieldsTopics.deleteMany({ topicId, fieldId: { $in: fieldIds } }).exec()
    }

    async deleteAllByTopicId(topicId: string): Promise<any> {
        return this.refFieldsTopics.deleteMany({ topicId }).exec()
    }
}
