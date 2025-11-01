import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { KnowledgeSource } from '../schemas/knowledge-source.schema'
import { Model } from 'mongoose'

@Injectable()
export class CreateSearchIndexerProvider {
    constructor(@InjectModel(KnowledgeSource.name) private readonly knowledgeSourceModel: Model<KnowledgeSource>) {}
    public async createSearchIndexer(indexerName: string) {
        // Logic to create search indexer for knowledge sources
        let isExists = false

        while (!isExists) {
            const cursor = await this.knowledgeSourceModel.listSearchIndexes()
            for await (const index of cursor) {
                if (index.name === indexerName) {
                    console.log(`Search index named ${indexerName} already exists.`)
                    isExists = true
                    break
                }
            }
        }
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
                        numDimensions: 2048,
                        path: 'plot_embedding_voyage_3_large',
                        similarity: 'dotProduct',
                        quantization: 'scalar'
                    }
                ]
            }
        }
        // run the helper method
        const result = await this.knowledgeSourceModel.createSearchIndex(index)
        console.log(`New search index named ${result} is building.`)
        // wait for the index to be ready to query
        console.log('Polling to check if the index is ready. This may take up to a minute.')
        let isQueryable = false
        while (!isQueryable) {
            const cursor = await this.knowledgeSourceModel.listSearchIndexes()
            for await (const index of cursor) {
                if (index.name === result) {
                    isQueryable = true
                } else {
                    await new Promise((resolve) => setTimeout(resolve, 5000))
                }
            }
        }
    }
}
