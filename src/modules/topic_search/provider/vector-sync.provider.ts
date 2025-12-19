import { Injectable } from '@nestjs/common'
import { PaginatedGeneralTopics, RequestGetTopicsInPhaseParams } from '../../topics/dtos'
import { GetTopicProvider } from '../../topics/providers/get-topic.provider'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bullmq'
import { plainToInstance } from 'class-transformer'

@Injectable()
export class VectorSyncProvider {
    constructor(
        @InjectQueue('vector-sync-queue')
        private readonly vectorSyncQueue: Queue,
        private readonly getTopicProvider: GetTopicProvider
    ) {}
    async syncDataInPeriodOnPhase(periodId: string, query: RequestGetTopicsInPhaseParams) {
        const resData = await this.getTopicProvider.getTopicsInPhase(periodId, query)
        const topicsData = await plainToInstance(PaginatedGeneralTopics, resData, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
        const { data: rawTopics } = topicsData
        if (rawTopics.length === 0) {
            console.log('Không có đề tài nào')
            return
        }
        await this.vectorSyncQueue.add('sync-registering-topics-in-period', { topics: rawTopics })
        //bắn socket cho ban chủ nhiệm nè -comming soon
    }
}