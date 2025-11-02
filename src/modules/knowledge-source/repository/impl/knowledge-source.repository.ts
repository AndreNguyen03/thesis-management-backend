import { Inject } from '@nestjs/common'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { KnowledgeSource } from '../../schemas/knowledge-source.schema'
import { IKnowledgeSourceRepository } from '../knowledge-source.interface'
import { InjectModel } from '@nestjs/mongoose'
import { UpdateKnowledgeSourceDto } from '../../dto/update-knowledge-source.dto'
import { Model } from 'mongoose'
import { CreateKnowledgeSourceDto } from '../../dto/create-knowledge-source.dto'

export class KnowledgeSourceRepository
    extends BaseRepositoryAbstract<KnowledgeSource>
    implements IKnowledgeSourceRepository
{
    constructor(@InjectModel(KnowledgeSource.name) private readonly knowledgeSourceModel: Model<KnowledgeSource>) {
        super(knowledgeSourceModel)
    }
    async createManyKnowledgeSources(
        createKnowledgeSourceDtos: CreateKnowledgeSourceDto[]
    ): Promise<KnowledgeSource[]> {
        const knowledgeSources = await this.knowledgeSourceModel.insertMany(createKnowledgeSourceDtos)
        return knowledgeSources.map((doc) => doc.toObject())
    }
    async updateKnowledgeSource(id: string, updateData: UpdateKnowledgeSourceDto): Promise<boolean> {
        const res = await this.knowledgeSourceModel.updateOne({ _id: id }, updateData).exec()
        return res.modifiedCount > 0
    }
}
