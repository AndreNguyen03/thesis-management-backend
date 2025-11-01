import { Inject, Injectable } from '@nestjs/common'
import { ConfigType } from '@nestjs/config'
import voyageConfig from '../../../auth/config/voyage.config'
import { VoyageAIClient } from 'voyageai'

@Injectable()
export class GetEmbeddingProvider {
    private client: any
    constructor(
        @Inject(voyageConfig.KEY)
        private readonly voyageConfiguration: ConfigType<typeof voyageConfig>
    ) {
        const apiKey = this.voyageConfiguration.apiKey || process.env.VOYAGE_API_KEY
        this.client = new VoyageAIClient({ apiKey })
    }
    async getEmbedding(text: string): Promise<number[]> {
        const results = await this.client.embed({
            input: text,
            model: 'voyage-3-large'
        })
        return results.data[0].embedding
    }
}
