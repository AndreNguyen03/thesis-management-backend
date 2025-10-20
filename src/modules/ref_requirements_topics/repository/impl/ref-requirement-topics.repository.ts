import { InjectModel } from '@nestjs/mongoose'
import { RefRequirementTopics } from '../../schemas/ref_requirement_topics.schemas'
import { IRefRequirementTopicsRepository } from '../ref-requirement-topics.repository.interface'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'

export class RefRequirementTopicsRepository
    extends BaseRepositoryAbstract<RefRequirementTopics>
    implements IRefRequirementTopicsRepository
{
    constructor(@InjectModel(RefRequirementTopics.name) private readonly refRequirementTopics: any) {
        super(refRequirementTopics)
    }
    createWithRequirmentIds(topicId: string, requirementIds: string[]): Promise<RefRequirementTopics[]> {
        return this.refRequirementTopics.insertMany(
            requirementIds.map((requirementId) => ({
                topicId,
                requirementId: requirementId
            }))
        )
    }
    deleteManyByRequirementIdsAndTopicId(topicId: string, requirementIds: string[]): Promise<any> {
        return this.refRequirementTopics.deleteMany({ topicId, requirementId: { $in: requirementIds } }).exec()
    }

    deleteManyByTopicId(topicId: string): Promise<any> {
        return this.refRequirementTopics.deleteMany({ topicId }).exec()
    }
}
