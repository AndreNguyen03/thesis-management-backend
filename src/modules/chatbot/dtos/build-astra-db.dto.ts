import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class BuildAstraDB {
    @IsNotEmpty()
    @IsString({ each: true })
    urlInputs: string[]
    @IsOptional()
    model?: string
    @IsOptional()
    collectionName?: string
}
