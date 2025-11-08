import { Injectable } from '@nestjs/common'
import { KnowledgeSource } from '../schemas/knowledge-source.schema'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Document } from 'mongoose'
import { PaginationProvider } from '../../../common/pagination-an/providers/pagination.provider'
import { RequestKnowledgeSourceDto } from '../dto/request-get-knowledge-source.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { UpdateKnowledgeSourceDto } from '../dto/update-knowledge-source.dto'
import { pipeline } from 'stream'

@Injectable()
export class KnowledgeSourceService {
    constructor(
        private readonly paginationProvider: PaginationProvider,
        @InjectModel(KnowledgeSource.name)
        private readonly knowledgeSourceModel: Model<KnowledgeSource & Document>
    ) {}
    async findAll(query: RequestKnowledgeSourceDto): Promise<Paginated<KnowledgeSource & Document>> {
        // pipeline getting Owner information
        let pipelineSub: any[] = []
        pipelineSub.push({
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner_info'
            }
        })
        pipelineSub.push({
            $addFields: {
                owner_info: { $arrayElemAt: ['$owner_info', 0] }
            }
        })
        // pipelineSub.push({ $unwind: { path: '$owner_info', preserveNullAndEmptyArrays: true } })

        // Implementation for fetching knowledge sources based on the query
        return await this.paginationProvider.paginateQuery(
            {
                limit: query.limit,
                page: query.page
            },
            this.knowledgeSourceModel,
            pipelineSub
        )
    }
    async updateKnowledgeSources(klid: string, query: UpdateKnowledgeSourceDto): Promise<KnowledgeSource | null> {
        const updatedKnowledgeSource = await this.knowledgeSourceModel
            .findByIdAndUpdate(klid, query, { new: true })
            .exec()
        return updatedKnowledgeSource ? updatedKnowledgeSource.toObject() : null
    }
}
