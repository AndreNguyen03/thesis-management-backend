import { BadGatewayException, forwardRef, Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { KnowledgeChunk } from '../schemas/knowledge-chunk.schema'
import { KnowledgeSource } from '../schemas/knowledge-source.schema'
import { KnowledgeStatus } from '../enums/knowledge-status.enum'
import { TopicVector } from '../../topic_search/schemas/topic-vector.schemas'
import { SourceType } from '../enums/source_type.enum'
export interface SearchOptions {
    sourceTypes?: SourceType[] // Filter theo loại nguồn
    limit?: number
    scoreThreshold?: number // Ngưỡng điểm similarity tối thiểu
}

@Injectable()
export class SearchSimilarDocumentsProvider {
    constructor(
        @InjectModel(KnowledgeChunk.name) private readonly knowledgeChunkModel: Model<KnowledgeChunk>,
        @InjectModel(KnowledgeSource.name) private readonly knowledgeSourceModel: Model<KnowledgeSource>,
        @InjectModel(TopicVector.name) private readonly topicVectorModel: Model<TopicVector>
    ) {}

    public async searchSimilarDocuments(queryVector: number[], options: SearchOptions): Promise<KnowledgeChunk[]> {
        const { sourceTypes, limit = 10, scoreThreshold = 0.7 } = options

        console.log('Searching similar documents with query vector of length:', JSON.stringify(queryVector).length)
      
       
        // Build filter for vector search - bao gồm cả source_type để filter ngay
        const vectorSearchFilter: any = {
        }
        
        // Thêm filter source_type trực tiếp trong vector search để tăng hiệu năng
        if (sourceTypes && sourceTypes.length > 0) {
            vectorSearchFilter.source_type = { $in: sourceTypes }
        }
        
        const agg: any[] = [
            // Stage 1: Vector Search với filter ngay
            {
                $vectorSearch: {
                    index: 'search_knowledge_chunk',
                    path: 'plot_embedding_gemini_large',
                    queryVector: queryVector,
                    filter: vectorSearchFilter,
                    limit: limit * 2,
                    numCandidates: limit * 20
                }
            },
            // Stage 2: Add similarity score
            {
                $addFields: {
                    score: { $meta: 'vectorSearchScore' }
                }
            },
            // Stage 3: Filter theo score threshold
            {
                $match: {
                    score: { $gte: scoreThreshold }
                }
            },
            // Stage 4: Project fields cần thiết (source_type đã có sẵn trong chunk)
            {
                $project: {
                    text: 1,
                    source_id: 1,
                    source_type: 1,
                    original_id: 1,
                    score: 1
                }
            },
            // Stage 5: Sort và Limit kết quả
            { $sort: { score: -1 } },
            { $limit: limit }
        ]
        // run pipeline
        const result = await this.knowledgeChunkModel.aggregate(agg)
        console.log('📊 Search Results:', {
            totalChunks: result.length,
            avgScore: result.length > 0 ? (result.reduce((sum, r) => sum + r.score, 0) / result.length).toFixed(3) : 0
        })
        return result
    }
}
