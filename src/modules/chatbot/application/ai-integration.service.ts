import { Injectable, HttpException, HttpStatus, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AIModelConfig, VectorSearchConfig, EmbeddingConfig } from '../interfaces/ai-interface'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { DataAPIClient } from '@datastax/astra-db-ts'
import { convertToModelMessages, streamText } from 'ai'
import { createGoogleGenerativeAI, google } from '@ai-sdk/google'
import { BuildAstraDB } from '../dtos/build-astra-db.dto'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { PuppeteerWebBaseLoader } from '@langchain/community/document_loaders/web/puppeteer'
@Injectable()
export class AIIntegrationService {
    private aiConfig: AIModelConfig
    private vectorConfig: VectorSearchConfig
    private embeddingConfig: EmbeddingConfig
    private embeddingModel: any
    private genAI: any
    private client: any
    private db: any
    private google: any
    constructor(private configService: ConfigService) {
        this.initializeConfigs()
    }

    private initializeConfigs() {
        // Initialize AI model config
        this.aiConfig = {
            provider: 'google',
            model: 'models/gemini-2.5-flash',
            apiKey: this.configService.get('GEMINI_API_KEY') || ''
        }

        // Initialize vector search config
        this.vectorConfig = {
            provider: 'astra',
            db_namespace: this.configService.get('ASTRA_DB_NAMESPACE'),
            db_collection: this.configService.get('ASTRA_DB_COLLECTION'),
            db_api_endpoint: this.configService.get('ASTRA_DB_API_ENDPOINT'),
            db_application_token: this.configService.get('ASTRA_DB_APPLICATION_TOKEN')
        }

        // Initialize embedding config
        this.embeddingConfig = {
            provider: 'google',
            model: 'text-embedding-004'
        }
        this.genAI = new GoogleGenerativeAI(this.aiConfig.apiKey!)
        this.embeddingModel = this.genAI.getGenerativeModel({
            model: this.embeddingConfig.model
        })
        this.client = new DataAPIClient(this.vectorConfig.db_application_token)

        this.db = this.client.db(this.vectorConfig.db_api_endpoint, {
            keyspace: this.vectorConfig.db_namespace
        })
        this.google = createGoogleGenerativeAI({
            apiKey: this.aiConfig.apiKey!
        })
    }

    async generateEmbedding(text: string): Promise<number[]> {
        try {
            switch (this.embeddingConfig.provider) {
                case 'google':
                    return await this.generateGoogleEmbedding(text)
                default:
                    throw new Error(`Unsupported embedding provider: ${this.embeddingConfig.provider}`)
            }
        } catch (error) {
            console.error('Embedding generation failed:', error)
            throw new HttpException('Failed to generate embedding', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    async searchSimilarDocuments(vector: number[]): Promise<any[]> {
        try {
            switch (this.vectorConfig.provider) {
                // case 'pinecone':
                //     return await this.searchPinecone(vector)
                case 'astra':
                    return await this.searchAstraDB(vector)
                default:
                    throw new Error(`Unsupported vector provider: ${this.vectorConfig.provider}`)
            }
        } catch (error) {
            console.error('Vector search failed:', error)
            throw new HttpException('Failed to search documents', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    async streamAIResponse(prompt: string, messages: any[]): Promise<AsyncIterable<string>> {
        try {
            switch (this.aiConfig.provider) {
                case 'google':
                    return await this.streamGoogle(prompt, messages)
                default:
                    throw new Error(`Unsupported AI provider: ${this.aiConfig.provider}`)
            }
        } catch (error) {
            console.error('AI streaming failed:', error)
            throw new HttpException('Failed to stream AI response', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    private async generateGoogleEmbedding(text: string): Promise<number[]> {
        // TODO: Implement Google AI embedding
        // Placeholder for now
        const embedding = await this.embeddingModel.embedContent(text)
        return embedding.embedding.values
    }

    private async searchAstraDB(vector: number[]): Promise<any[]> {
        // TODO: Implement Astra DB search
        // Similar to your original code
        const collection = await this.db.collection(this.vectorConfig.db_collection)
        const cursor = collection.find(
            {},
            {
                sort: { $vector: vector },
                limit: 10,
                includeSimilarity: true
            }
        )
        return await cursor.toArray()
    }

    public async buildAstraDB(buildAstraDB: BuildAstraDB) {
        const urlInputs = buildAstraDB.urlInputs

        try {
            // Create collection if not exists
            const collectionName = buildAstraDB.collectionName || this.vectorConfig.db_collection
            console.log(this.vectorConfig.db_collection)
            await this.db.createCollection(collectionName, {
                vector: {
                    dimension: 768,
                    metric: 'dot_product'
                }
            })
            // Load sample data
            await this.loadSampleData(collectionName, urlInputs)

            return { success: true }
        } catch (error) {
            console.error('Error building Astra DB:', error)
        }
    }

    async loadSampleData(collectionName: string | undefined, urlInputs: string[] = []) {
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 512,
            chunkOverlap: 100
        })
        const collection = await this.db.collection(collectionName)
        try {
            for await (const url of urlInputs) {
                console.log(url)
                const content = await scrapePage(url)
                const chunks = await splitter.splitText(content)
                for await (const chunk of chunks) {
                    // Create embedding using Google
                    const embeddingResp = await this.embeddingModel.embedContent(chunk)
                    const vector = embeddingResp.embedding.values
                    //console.log('Embedding dimension:', vector.length)
                    const res = await collection.insertOne({
                        $vector: vector,
                        text: chunk
                    })
                    console.log(res)
                }
            }
        } catch (error) {
            throw new BadRequestException('Error loading sample data into Astra DB', error.message)
        }
    }
    private async *streamGoogle(prompt: string, messages: any[]): AsyncIterable<string> {
        //console.log('Streaming with Google Gemini...')
        const result = await streamText({
            model: this.google('models/gemini-2.5-flash'),
            system: prompt,
            messages: convertToModelMessages(messages)
        })
        for await (const text of result.textStream) {
            yield text
        }
    }
}
const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: {
            headless: true
        },
        gotoOptions: {
            waitUntil: 'domcontentloaded'
        },
        evaluate: async (page, browser) => {
            const result = await page.evaluate(() => {
                return document.body.innerText
            })
            await browser.close()
            return result
        }
    })
    return (await loader.scrape())?.replace(/<[^>]*>?/gm, '')
}
