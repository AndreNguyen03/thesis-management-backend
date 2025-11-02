import { IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { CreateKnowledgeSourceDto } from '../../knowledge-source/dto/create-knowledge-source.dto'
import { Type } from 'class-transformer'

export class BuildKnowledgeDB {
    @IsNotEmpty()

    knowledgeDocuments: CreateKnowledgeSourceDto[]
}
