import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { PaginatedGeneralTopics, RequestGetTopicsInPhaseParams } from '../../topics/dtos'
import { GetTopicProvider } from '../../topics/providers/get-topic.provider'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { plainToInstance } from 'class-transformer'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'
import { KnowledgeSourceService } from '../../knowledge-source/application/knowledge-source.service'
import { TopicStatus } from '../../topics/enum'

@Injectable()
export class VectorSyncProvider {
    constructor(
        @InjectQueue('vector-sync-queue')
        private readonly vectorSyncQueue: Queue,
        private readonly getTopicProvider: GetTopicProvider,
        @Inject(forwardRef(() => KnowledgeSourceService))
        private readonly knowledgeSourceService: KnowledgeSourceService
    ) {}
    async syncDataInPeriodOnPhase(periodId: string, query: RequestGetTopicsInPhaseParams, actorId?: string) {
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
        console.log(`Đang đồng bộ ${rawTopics.length} đề tài lên vector database`)
        await this.vectorSyncQueue.add('sync-topics-in-period-to-topic-vector', { topics: rawTopics })
        if (query.phase === PeriodPhaseName.OPEN_REGISTRATION) {
            await this.knowledgeSourceService.syncRegisteringTopicsDataToKnowledgeSource(periodId, actorId)
        }
        if (query.phase === PeriodPhaseName.COMPLETION && query.status === TopicStatus.Archived) {
            await this.knowledgeSourceService.syncTopicsInLibraryDataToKnowledgeSource(periodId, actorId)
        }
        //bắn socket cho ban chủ nhiệm nè -comming soon
    }
}
