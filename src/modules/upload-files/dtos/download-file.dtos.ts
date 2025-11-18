import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class DownloadFileDto {
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    fileNames: string[]
}
