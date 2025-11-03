import { Processor, Process } from '@nestjs/bull'
import { Job } from 'bullmq'
import { RetrievalProvider } from '../application/retrieval.provider'
export class KnowledgeProcessingProcessor {
    constructor(private readonly retrievalProvider: RetrievalProvider) {}

    @Process('processKnowledge')
    async handleProcessKnowledge(job: Job<{ sourceId: string; url: string }>) {
        const { sourceId, url } = job.data
        await this.retrievalProvider.loadSampleData(sourceId, url)
    }
}
