import { Inject, Injectable } from '@nestjs/common'
import { IRefFieldsTopicsRepository } from '../repository/ref-fields-topics.repository.interface'

@Injectable()
export class RefFieldsTopicsService {
    constructor(
        @Inject('IRefFieldsTopicsRepository')
        private readonly refFieldsTopicsRepository: IRefFieldsTopicsRepository
    ) {}
    async createWithFieldIds(topicId: string, fieldId: string[]) {
        if (!fieldId || fieldId.length === 0) {
            return []
        }
        const names = await this.refFieldsTopicsRepository.createWithFieldIds(topicId, fieldId)
        return names
    }

    async deleteRefFieldsTopicByFieldIdsAndTopicId(topicId: string, fieldIds: string[]) {
        return await this.refFieldsTopicsRepository.deleteManyByFieldIdsAndTopicId(topicId, fieldIds)
    }
    async deleteAllByTopicId(topicId: string) {
        return await this.refFieldsTopicsRepository.deleteAllByTopicId(topicId)
    }
}
