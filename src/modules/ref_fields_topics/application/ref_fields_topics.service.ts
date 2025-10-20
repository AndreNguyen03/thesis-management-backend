import { Inject, Injectable } from '@nestjs/common'
import { IRefFieldsTopicsRepository } from '../repository/ref-requirement-topics.repository.interface'

@Injectable()
export class RefFieldsTopicsService {
    constructor(
        @Inject('IRefFieldsTopicsRepository')
        private readonly refFieldsTopicsRepository: IRefFieldsTopicsRepository
    ) {}
    createRefFieldsTopic(topicId: string, fieldId: string[]) {
        this.refFieldsTopicsRepository.createWithFieldIds(topicId, fieldId)
    }
    deleteRefFieldsTopicByFieldIdsAndTopicId(topicId: string, fieldIds: string[]) {
        return this.refFieldsTopicsRepository.deleteManyByFieldIdsAndTopicId(topicId, fieldIds)
    }
    deleteManyByTopicId(topicId: string) {
        return this.refFieldsTopicsRepository.deleteManyByTopicId(topicId)
    }
}
