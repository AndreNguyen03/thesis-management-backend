import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bullmq'
import { BuildKnowledgeDB } from '../dtos/build-knowledge-db.dto'
import { CreateKnowledgeSourceProvider } from '../../knowledge-source/application/create-knowledge-source.provider'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { PuppeteerWebBaseLoader } from '@langchain/community/document_loaders/web/puppeteer'
import { GetEmbeddingProvider } from './get-embedding.provider'
import { CreateKnowledgeChunksProvider } from '../../knowledge-source/application/create-knowledge-chunks.provider'
import { SourceType } from '../../knowledge-source/enums/source_type.enum'
import { KnowledgeChunk } from '../../knowledge-source/schemas/knowledge-chunk.schema'
import { KnowledgeSource } from '../../knowledge-source/schemas/knowledge-source.schema'
import { SearchSimilarDocumentsProvider } from '../../knowledge-source/application/search-similar-documents.provider copy'
import { VectordbService } from '../../vectordb/application/vectordb.service'

@Injectable()
export class RetrievalProvider {
    constructor(
        private readonly getEmbeddingProvider: GetEmbeddingProvider,
        @Inject()
        private readonly knowledgeChunksProvider: CreateKnowledgeChunksProvider,
        @Inject() private readonly knowledgeSourceProvider: CreateKnowledgeSourceProvider,
        @Inject() private readonly searchSimilarDocumentsProvider: SearchSimilarDocumentsProvider,
        @InjectQueue('knowledge-processing') private readonly knowledgeQueue: Queue,
        private readonly vectorDbService: VectordbService
    ) {}

    public async searchSimilarDocuments(vectorSearch: number[]): Promise<KnowledgeChunk[]> {
        // Search similar documents in the database
        return await this.searchSimilarDocumentsProvider.searchSimilarDocuments(vectorSearch)
    }

    async searchCollection(params: {
        collection: 'lecturers' | 'topics' | 'process_docs'
        vector: number[]
        limit?: number
        filter?: any
        scoreThreshold?: number
    }) {
        const { collection, vector, limit = 5, filter, scoreThreshold = 0.3 } = params
        // 2️⃣ Search Qdrant
        const results = await this.vectorDbService.search(collection, vector, limit, filter)

        // 3️⃣ Normalize result
        return results
            .filter((r) => r.score >= scoreThreshold)
            .map((r) => ({
                id: r.id,
                score: r.score,
                payload: r.payload
            }))
    }

    public async buildKnowledgeDocuments(
        userId: string,
        buildKnowledgeDB: BuildKnowledgeDB
    ): Promise<KnowledgeSource[]> {
        const knowledgeSources: KnowledgeSource[] = []
        for (const doc of buildKnowledgeDB.knowledgeDocuments) {
            //Store knowledge source metadata into database incase of URL type
            if (doc.source_type === SourceType.URL) {
                // Add knowledge documents to database
                const storedKnowledgeDoc = await this.knowledgeSourceProvider.createKnowledgeSource(userId, doc)
                //Bắt đầu xử lý dữ liệu crawl-split-embed-store cho từng doc
                await this.loadSampleData(storedKnowledgeDoc._id.toString(), doc.source_location)
                // Gửi job vào BullMQ
                // await this.knowledgeQueue.add('processKnowledge', {
                //     sourceId: storedKnowledgeDoc._id.toString(),
                //     url: doc.source_location
                // })
                // knowledgeSources.push(storedKnowledgeDoc)
            }
        }
        console.log('Completed building basic knowledge documents.')
        return knowledgeSources
    }

    public async loadSampleData(sourceId: string, url: string) {
        //Declare splitter to split text into chunks
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1024,
            chunkOverlap: 100,
            separators: ['\n\n', '\n', '. ']
        })
        //create vector search if not exists

        try {
            console.log(url)
            const content = await scrapePage(url)
            console.log('Scraped content length:', content)
            const chunks = await splitter.splitText(content)
            for await (const chunk of chunks) {
                // Create embedding using Google
                const vector = await this.getEmbeddingProvider.getEmbedding(chunk)
                console.log('Created embedding for chunk', vector.length)
                //console.log('Embedding dimension:', vector.length)
                const res = await this.knowledgeChunksProvider.createKnowledgeChunks({
                    source_id: sourceId,
                    text: chunk,
                    plot_embedding_gemini_large: vector
                })
                console.log('Stored chunk result:', chunk)
                console.log('result chunk saving', res)
            }
        } catch (error) {
            throw new BadRequestException(error.message)
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
