import { Inject, Injectable } from '@nestjs/common'
import { TopicRepositoryInterface } from '../repository'
import { PaginatedGeneralTopics, RequestGetTopicsInPeriodDto, RequestGetTopicsInPhaseDto } from '../dtos'
import { plainToInstance } from 'class-transformer'
@Injectable()
export class GetTopicProvider {
    // Add methods and logic as needed
    constructor(
        @Inject('TopicRepositoryInterface') private readonly topicRepositoryInterface: TopicRepositoryInterface
    ) {}

    async getTopicsInPhase(periodId: string, query: RequestGetTopicsInPhaseDto): Promise<PaginatedGeneralTopics> {
        const res = await this.topicRepositoryInterface.getTopicsInPhaseHistory(periodId, query)
        return await plainToInstance(PaginatedGeneralTopics, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    getLecturerSubmittedTopicNum(lecturerId: string): Promise<number> {
        return this.topicRepositoryInterface.getSubmittedTopicsNumber(lecturerId)
    }
}
