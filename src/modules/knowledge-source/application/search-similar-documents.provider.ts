import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { KnowledgeChunk } from '../schemas/knowledge-chunk.schema'

@Injectable()
export class SearchSimilarDocumentsProvider {
    constructor(@InjectModel(KnowledgeChunk.name) private readonly knowledgeChunkModel: Model<KnowledgeChunk>) {}
    public async searchSimilarDocuments(sourceId: string[], queryVector: number[]) :Promise<KnowledgeChunk[]> {
        const agg = [
            {
                $vectorSearch: {
                    index: 'vector_index',
                    path: 'plot_embedding_voyage_3_large',
                    queryVector: queryVector,
                    exact: true,
                    limit: 10
                },
                $match: {
                    source_id: { $in: sourceId }
                }
            },
            {
                $project: {
                    _id: 0,
                    text: 1,
                    sourceId: 0,
                    score: {
                        $meta: 'vectorSearchScore'
                    }
                }
            }
        ]
        // run pipeline
        const result = this.knowledgeChunkModel.aggregate(agg)
        return result
    }
}
