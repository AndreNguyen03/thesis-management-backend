import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { KnowledgeChunk } from '../schemas/knowledge-chunk.schema'

@Injectable()
export class CreateSearchIndexerProvider {
    constructor(@InjectModel(KnowledgeChunk.name) private readonly knowledgeChunkModel: Model<KnowledgeChunk>) {}
    public async createSearchIndexer(indexerName: string) {
        // Logic to create search indexer for knowledge sources
        console.log(`Checking if search index named ${indexerName} exists.`)
        let isExists = false

        try {
            const cursor = await this.knowledgeChunkModel.listSearchIndexes()
            console.log('Checking cursor:', cursor)
            for await (const index of cursor) {
                if (index.name === indexerName) {
                    console.log(`Search index named ${indexerName} already exists.`)
                    isExists = true
                    break
                }
            }
        } catch (error) {
            console.error('Error listing search indexes:', error)
            throw error
        }
        console.log(`Search index named ${indexerName} is being created.`)
        //if the index exists, return
        if (isExists) return
        // define your MongoDB Vector Search index
        const index = {
            name: indexerName,
            type: 'vectorSearch',
            definition: {
                fields: [
                    {
                        type: 'vector',
                        numDimensions: 768, //depending on the embedding model dimension
                        path: 'plot_embedding_gemini_large',
                        similarity: 'dotProduct',
                        quantization: 'scalar'
                    }
                ]
            }
        }
        // run the helper method
        const result = await this.knowledgeChunkModel.createSearchIndex(index)
        console.log(`New search index named ${result} is building.`)
        // wait for the index to be ready to query
        console.log('Polling to check if the index is ready. This may take up to a minute.')
        let isQueryable = false
        while (!isQueryable) {
            const cursor = await this.knowledgeChunkModel.listSearchIndexes()
            for await (const index of cursor) {
                if (index.name === result) {
                    isQueryable = true
                }
            }
        }
    }
}
