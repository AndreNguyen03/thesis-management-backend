import { IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { CreateKnowledgeSourceDto } from '../../knowledge-source/dto/create-knowledge-source.dto'

export class BuildKnowledgeDB {
    @IsNotEmpty()
    @IsString({ each: true })
    knowledgeDocuments: CreateKnowledgeSourceDto[]
}
