import { Injectable } from '@nestjs/common'
import { TopicVector } from '../schemas/topic-vector.schemas'
import { Model } from 'mongoose'
import { InjectModel } from '@nestjs/mongoose'

@Injectable()
export class CreateSearchIndexProvider {
    constructor(@InjectModel(TopicVector.name) private readonly topicVectorModel: Model<TopicVector>) {}
    public async createTopicVectorIndexer(indexerName: string, embeddingField: string = 'embedding') {
        // Logic to create search indexer for knowledge sources
        console.log(`Checking if search index named ${indexerName} exists.`)
        let isExists = false

        try {
            const cursor = await this.topicVectorModel.listSearchIndexes()
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
                        path: embeddingField,
                        similarity: 'dotProduct',
                        quantization: 'scalar'
                    },
                    {
                        type: 'filter',
                        path: 'type'
                    },
                    {
                        type: 'filter',
                        path: 'periodId'
                    },
                    {
                        type: 'filter',
                        path: 'lastStatusInPhaseHistory.phaseName'
                    },
                    {
                        type: 'filter',
                        path: 'lastStatusInPhaseHistory.status'
                    }
                ]
            }
        }
        // run the helper method
        const result = await this.topicVectorModel.createSearchIndex(index)
        console.log(`New search index named ${result} is building.`)
        // wait for the index to be ready to query
        console.log('Polling to check if the index is ready. This may take up to a minute.')
        let isQueryable = false
        while (!isQueryable) {
            const cursor = await this.topicVectorModel.listSearchIndexes()
            for await (const index of cursor) {
                if (index.name === result) {
                    isQueryable = true
                }
            }
        }
    }
}
