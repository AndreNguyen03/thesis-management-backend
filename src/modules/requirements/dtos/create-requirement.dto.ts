import { IsNotEmpty, IsOptional } from 'class-validator'

export class CreateRequirementDto {
    @IsNotEmpty()
    name: string
    @IsNotEmpty()
    slug: string
    @IsOptional()
    description?: string
}
