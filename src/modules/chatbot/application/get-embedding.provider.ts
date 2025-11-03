import { Inject, Injectable } from '@nestjs/common'
import { ConfigType } from '@nestjs/config'
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai'
import { googleAIConfig } from '../../../config/googleai.config'


@Injectable()
export class GetEmbeddingProvider {
    private genAI: GoogleGenerativeAI

    private embeddingModel: GenerativeModel
    constructor(
        @Inject(googleAIConfig.KEY)
        private readonly googleAIConfiguration: ConfigType<typeof googleAIConfig>
    ) {
        const apiKey = this.googleAIConfiguration.apiKey
        this.genAI = new GoogleGenerativeAI(apiKey)
        this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' })
    }
    async getEmbedding(text: string): Promise<number[]> {
        //Implement Google AI embedding
        const embedding = await this.embeddingModel.embedContent(text)
        return embedding.embedding.values
    }
}
