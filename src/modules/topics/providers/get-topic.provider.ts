import { Inject, Injectable } from '@nestjs/common'
import { TopicRepositoryInterface } from '../repository'
import { PaginatedGeneralTopics, RequestGetTopicsInAdvanceSearchParams, RequestGetTopicsInPhaseParams } from '../dtos'
import { plainToInstance } from 'class-transformer'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { Topic } from '../schemas/topic.schemas'
import { GetRegistrationInTopicProvider } from '../../registrations/provider/get-registration-in-topic.provider'
@Injectable()
export class GetTopicProvider {
    // Add methods and logic as needed
    constructor(
        @Inject('TopicRepositoryInterface') private readonly topicRepositoryInterface: TopicRepositoryInterface,
    ) {}
    async getTopicsInPhase(periodId: string, query: RequestGetTopicsInPhaseParams): Promise<Paginated<Topic>> {
        return await this.topicRepositoryInterface.getTopicsInPhaseHistory(periodId, query)
    }
    async getTopicsInLibrary(query: RequestGetTopicsInAdvanceSearchParams): Promise<Paginated<Topic>> {
        return await this.topicRepositoryInterface.getTopicsInLibrary(query)
    }

    async getRegisteringTopics(
        periodId: string,
        query: RequestGetTopicsInAdvanceSearchParams
    ): Promise<Paginated<Topic>> {
        return await this.topicRepositoryInterface.getRegisteringTopics(periodId, query)
    }

    async getLecturerSubmittedTopicNum(lecturerId: string): Promise<number> {
        return this.topicRepositoryInterface.getSubmittedTopicsNumber(lecturerId)
    }

    // private async mergeTopicWithRelatedInfo(topic: GetTopicDetailResponseDto): Promise<GetTopicDetailResponseDto> {
    //     const res = await this.getRegistrationInTopicProvider.getApprovedAndPendingStudentRegistrationsInTopic(
    //         topic._id
    //     )
    //     return {
    //         ...topic,
    //         students: {
    //             approvedStudents: res ? res.approvedStudents : [],
    //             pendingStudents: res ? res.pendingStudents : []
    //         }
    //     }
    // }
}
