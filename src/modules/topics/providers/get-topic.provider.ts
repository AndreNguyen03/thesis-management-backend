import { Inject, Injectable } from '@nestjs/common'
import { Model } from 'mongoose'
import { Topic } from '../schemas/topic.schemas'
import { TopicRepositoryInterface } from '../repository'
import { RequestGetTopicsInPeriodDto, RequestGetTopicsInPhaseDto } from '../dtos'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'

@Injectable()
export class GetTopicProvider {
    // Add methods and logic as needed
    constructor(
        @Inject('TopicRepositoryInterface') private readonly topicRepositoryInterface: TopicRepositoryInterface
    ) {}

    getTopicsInPeriod(periodId: string, query: RequestGetTopicsInPeriodDto): Promise<Paginated<Topic>> {
        return this.topicRepositoryInterface.getTopicsInPeriod(periodId, query)
    }
    getTopicsInPhase(phaseId: string, query: RequestGetTopicsInPhaseDto): Promise<Paginated<Topic>> {
        return this.topicRepositoryInterface.getTopicsInPhase(phaseId, query)
    }
    getLecturerSubmittedTopicNum(lecturerId: string): Promise<number> {
        return this.topicRepositoryInterface.getSubmittedTopicsNumber(lecturerId)
    }
}
