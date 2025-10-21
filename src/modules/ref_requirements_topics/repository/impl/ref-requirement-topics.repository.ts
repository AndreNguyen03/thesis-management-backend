import { InjectModel } from '@nestjs/mongoose'
import { RefRequirementTopics } from '../../schemas/ref_requirement_topics.schemas'
import { IRefRequirementTopicsRepository } from '../ref-requirement-topics.repository.interface'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import mongoose, { Model } from 'mongoose'

export class RefRequirementTopicsRepository
    extends BaseRepositoryAbstract<RefRequirementTopics>
    implements IRefRequirementTopicsRepository
{
    constructor(
        @InjectModel(RefRequirementTopics.name) private readonly refRequirementTopics: Model<RefRequirementTopics>
    ) {
        super(refRequirementTopics)
    }
    async createWithRequirmentIds(topicId: string, requirementIds: string[]): Promise<string[]> {
        const docs = await this.refRequirementTopics.insertMany(
            requirementIds.map((requirementId) => ({
                topicId,
                requirementId
            }))
        )
        const populated = await this.refRequirementTopics.populate(docs, {
            path: 'requirementId',
            select: 'name'
        })
        return populated.map((d) => (d.requirementId as any)?.name).filter(Boolean) as string[]
    }
    async deleteManyByRequirementIdsAndTopicId(topicId: string, requirementIds: string[]): Promise<any> {
        return await this.refRequirementTopics.deleteMany({ topicId, requirementId: { $in: requirementIds } }).exec()
    }

    async deleteAllByTopicId(topicId: string): Promise<any> {
        return await this.refRequirementTopics.deleteMany({ topicId }).exec()
    }
}
