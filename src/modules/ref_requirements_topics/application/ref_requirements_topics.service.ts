import { Inject, Injectable } from '@nestjs/common'
import { IRefRequirementTopicsRepository } from '../repository/ref-requirement-topics.repository.interface'
import { CreateErrorException, DeleteErrorException } from '../../../common/exceptions'

@Injectable()
export class RefRequirementsTopicsService {
    constructor(
        @Inject('IRefRequirementTopicsRepository')
        private readonly refRequirementTopicsRepository: IRefRequirementTopicsRepository
    ) {}
    async createRefRequirementsTopic(topicId: string, requirementIds: string[]) {
        console.log('requirementIds in service:', requirementIds, topicId)
        const res = await this.refRequirementTopicsRepository.createWithRequirmentIds(topicId, requirementIds)
        if (!res) {
            throw new CreateErrorException('ref requirement topic')
        }
        return res
    }
    async deleteRefRequirementTopicByRequirementIdsAndTopicId(topicId: string, requirementIds: string[]) {
        const res = await this.refRequirementTopicsRepository.deleteManyByRequirementIdsAndTopicId(
            topicId,
            requirementIds
        )
        if (!res) {
            throw new DeleteErrorException('ref requirement topic')
        }
        return res
    }
    async deleteAllByTopicId(topicId: string) {
        const res = await this.refRequirementTopicsRepository.deleteAllByTopicId(topicId)
        if (!res) {
            throw new DeleteErrorException('tất cả ref requirement topic')
        }
        return res
    }
}
