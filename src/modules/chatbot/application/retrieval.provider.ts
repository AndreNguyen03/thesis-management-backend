import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { BuildKnowledgeDB } from '../dtos/build-astra-db.dto'
import { CreateKnowledgeSourceProvider } from '../../knowledge-source/application/create-knowledge-source.provider'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { PuppeteerWebBaseLoader } from '@langchain/community/document_loaders/web/puppeteer'
import { GetEmbeddingProvider } from './get-embedding.provider'
import { CreateKnowledgeChunksProvider } from '../../knowledge-source/application/create-knowledge-chunks.provider'
import { SourceType } from '../../knowledge-source/enums/source_type.enum'
import { SearchSimilarDocumentsProvider } from '../../knowledge-source/application/search-similar-documents.provider'
import { KnowledgeChunk } from '../../knowledge-source/schemas/knowledge-chunk.schema'

@Injectable()
export class RetrievalProvider {
    constructor(
        @Inject()
        private readonly knowledgeChunksProvider: CreateKnowledgeChunksProvider,
        @Inject() private readonly knowledgeSourceProvider: CreateKnowledgeSourceProvider,
        @Inject() private readonly searchSimilarDocumentsProvider: SearchSimilarDocumentsProvider,

        private readonly getEmbeddingProvider: GetEmbeddingProvider
    ) {}

    public async buildKnowledgeDocuments(buildKnowledgeDB: BuildKnowledgeDB): Promise<boolean> {
        for (const doc of buildKnowledgeDB.knowledgeDocuments) {
            //Store knowledge source metadata into database incase of URL type
            if (doc.source_type === SourceType.URL) {
                // Add knowledge documents to database
                const storedKnowledgeDoc = await this.knowledgeSourceProvider.createKnowledgeSource(doc)
                //Bắt đầu xử lý dữ liệu crawl-split-embed-store cho từng doc
                await this.loadSampleData(storedKnowledgeDoc._id.toString(), doc.source_location)
            }
        }
        return true
    }
    public async searchSimilarDocuments(
        knowledgeSourceId: string[],
        vectorSearch: number[]
    ): Promise<KnowledgeChunk[]> {
        // Search similar documents in the database
        return await this.searchSimilarDocumentsProvider.searchSimilarDocuments(knowledgeSourceId, vectorSearch)
    }
    private async loadSampleData(sourceId: string, url: string) {
        //Declare splitter to split text into chunks
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 512,
            chunkOverlap: 100
        })
        try {
            console.log(url)
            const content = await scrapePage(url)
            const chunks = await splitter.splitText(content)
            for await (const chunk of chunks) {
                // Create embedding using Google
                const vector = await this.getEmbeddingProvider.getEmbedding(chunk)
                //console.log('Embedding dimension:', vector.length)
                const res = await this.knowledgeChunksProvider.createKnowledgeChunks({
                    source_id: sourceId,
                    text: chunk,
                    plot_embedding_voyage_3_large: vector
                })
                console.log(res)
            }
        } catch (error) {
            throw new BadRequestException('Error loading sample data into Astra DB', error.message)
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
