import { Body, Controller, Post } from '@nestjs/common'
import { VectordbService } from './application/vectordb.service'
import { GetEmbeddingProvider } from '../chatbot/application/get-embedding.provider'

@Controller('vectordb')
export class VectordbController {
    constructor(
        private readonly vectorDbService: VectordbService,
        private readonly embeddingProvider: GetEmbeddingProvider
    ) {}

    @Post('search/lecturers')
    async searchLecturers(
        @Body()
        body: {
            query: string
            limit?: number
        }
    ) {
        const { query, limit = 2 } = body

        // 1. Embed query
        const queryEmbedding = await this.embeddingProvider.getEmbedding(query)

        // 2. Search Qdrant
        const result = await this.vectorDbService.search('lecturers', queryEmbedding, limit)

        // 3. Format output cho dễ nhìn
        return {
            query,
            total: result.length,
            hits: result.map((r) => ({
                score: r.score,
                pointId: r.id,
                payload: r.payload
            }))
        }
    }
}
