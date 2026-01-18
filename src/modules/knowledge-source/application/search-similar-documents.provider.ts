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
        const sourceQuery: any = {
            status: KnowledgeStatus.ENABLED,
            deleted_at: null
        }
        // Nếu có filter theo sourceTypes, thêm điều kiện
        if (sourceTypes && sourceTypes.length > 0) {
            sourceQuery.source_type = { $in: sourceTypes }
        }
        // Lấy sourceIds mà được người dùng set có thể thực hiện được
        const sourceIds = await this.knowledgeSourceModel.find(sourceQuery).distinct('_id')

        const agg: any[] = [
            // Stage 1: Vector Search
            {
                $vectorSearch: {
                    index: 'search_knowledge_chunk',
                    path: 'plot_embedding_gemini_large',
                    queryVector: queryVector,
                    limit: limit * 2,
                    numCandidates: limit * 10
                }
            },
            // Stage 2: Match với sources đã enable
            {
                $match: {
                    source_id: { $in: sourceIds }
                }
            }, // Stage 3: Add similarity score
            {
                $addFields: {
                    score: { $meta: 'vectorSearchScore' }
                }
            },
            // Stage 4: Filter theo score threshold
            {
                $match: {
                    score: { $gte: scoreThreshold }
                }
            },
            // Stage 5: Lookup để lấy source_type từ KnowledgeSource
            {
                $lookup: {
                    from: 'knowledge_sources',
                    localField: 'source_id',
                    foreignField: '_id',
                    as: 'source_info'
                }
            },
            // Stage 6: Unwind source_info
            {
                $unwind: {
                    path: '$source_info',
                    preserveNullAndEmptyArrays: false
                }
            },
            // Stage 7: Filter theo source_type nếu có
            ...(sourceTypes && sourceTypes.length > 0
                ? [
                      {
                          $match: {
                              'source_info.source_type': { $in: sourceTypes }
                          }
                      }
                  ]
                : []),
            // Stage 8: Project fields cần thiết
            {
                $project: {
                    text: 1,
                    source_id: 1,
                    source_type: '$source_info.source_type',
                    original_id: 1,
                    score: 1
                }
            },
            // Stage 9: Limit kết quả
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
