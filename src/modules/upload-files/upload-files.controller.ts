import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { UploadFilesService } from './application/upload-files.service'
import { FileInterceptor } from '@nestjs/platform-express'
@Controller('uploadfiles')
export class UploadFilesController {
    constructor(private readonly uploadFilesService: UploadFilesService) {}
    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        return await this.uploadFilesService.uploadFile(file)
    }
}
