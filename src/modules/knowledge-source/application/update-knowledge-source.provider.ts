import { Inject, Injectable } from '@nestjs/common'
import { IKnowledgeSourceRepository } from '../repository/knowledge-source.interface'
import { CreateKnowledgeSourceDto } from '../dto/create-knowledge-source.dto'
import { UpdateKnowledgeSourceDto } from '../dto/update-knowledge-source.dto'

@Injectable()
export class UpdateKnowledgeSourceProvider {
    constructor(
        @Inject('IKnowledgeSourceRepository') private readonly knowledgeSourceRepository: IKnowledgeSourceRepository
    ) {}

    public async updateKnowledgeSource(id: string, updateData: UpdateKnowledgeSourceDto) {
        // Logic to update a knowledge source
        const updatedKnowledgeSource = await this.knowledgeSourceRepository.updateKnowledgeSource(id, updateData)
        return updatedKnowledgeSource
    }
}
