import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator'
import { CreateKnowledgeSourceDto } from '../../knowledge-source/dto/create-knowledge-source.dto'
import { Type } from 'class-transformer'

export class BuildKnowledgeDB {
    @IsNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => CreateKnowledgeSourceDto)
    knowledgeDocuments: CreateKnowledgeSourceDto[]
}
