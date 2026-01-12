import { IsNotEmpty, IsOptional } from 'class-validator'

export class CreateFileDocumentDto {
    @IsNotEmpty()
    name: string
    @IsOptional()
    description?: string
}
