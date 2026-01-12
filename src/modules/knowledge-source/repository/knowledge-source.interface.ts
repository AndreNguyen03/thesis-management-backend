import { Update } from 'aws-sdk/clients/dynamodb'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { KnowledgeSource } from '../schemas/knowledge-source.schema'
import { UpdateKnowledgeSourceDto } from '../dto/update-knowledge-source.dto'
import { CreateKnowledgeSourceDto } from '../dto/create-knowledge-source.dto'

export interface IKnowledgeSourceRepository extends BaseRepositoryInterface<KnowledgeSource> {
    updateKnowledgeSource(id: string, updateData: UpdateKnowledgeSourceDto): Promise<boolean>
    createManyKnowledgeSources(createKnowledgeSourceDtos: CreateKnowledgeSourceDto[]): Promise<KnowledgeSource[]>
    findOneKLAndUpdate(knowledgeSourceId: string, metadata: any): Promise<KnowledgeSource | null>
}
