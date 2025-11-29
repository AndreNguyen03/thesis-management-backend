import { IsNotEmpty, IsString } from 'class-validator'

export class RenameFilesDto {
    @IsNotEmpty()
    @IsString()
    fileId: string

    @IsNotEmpty()
    @IsString()
    newFileName: string
}
