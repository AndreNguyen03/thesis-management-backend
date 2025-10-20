import { Inject, Injectable } from '@nestjs/common'
import { IRefRequirementTopicsRepository } from '../repository/ref-requirement-topics.repository.interface'

@Injectable()
export class RefRequirementsTopicsService {
    constructor(
        @Inject('IRefRequirementTopicsRepository')
        private readonly refRequirementTopicsRepository: IRefRequirementTopicsRepository
    ) {}
    createRefRequirementsTopic(topicId: string, requirementId: string[]) {
        this.refRequirementTopicsRepository.createWithRequirmentIds(topicId, requirementId)
    }
    deleteRefRequirementTopicByRequirementIdsAndTopicId(topicId: string, requirementIds: string[]) {
        return this.refRequirementTopicsRepository.deleteManyByRequirementIdsAndTopicId(topicId, requirementIds)
    }
    deleteManyByTopicId(topicId: string) {
        return this.refRequirementTopicsRepository.deleteManyByTopicId(topicId)
    }
}
