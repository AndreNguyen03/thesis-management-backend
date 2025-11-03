import { IsNotEmpty, IsOptional } from 'class-validator'

export class CreateFieldDto {
    @IsNotEmpty()
    name: string
    @IsNotEmpty()
    slug: string
    @IsNotEmpty()
    description: string
}
