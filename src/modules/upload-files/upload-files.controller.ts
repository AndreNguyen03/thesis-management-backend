import { BadRequestException, Body, Controller, Get, Param, Patch, Query, Res, UseGuards } from '@nestjs/common'
import { UploadFilesService } from './application/upload-files.service'
import { FilesInterceptor } from '@nestjs/platform-express'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { Roles } from '../../auth/decorator/roles.decorator'
import { UserRole } from '../../users/enums/user-role'
import { DownLoadFileProvider } from './providers/download-file.provider'
import type { Response } from 'express'
import { DownloadFileDto } from './dtos/download-file.dtos'
import { RenameFilesDto } from './dtos/rename-file.dtos'

@Controller('upload-files')
export class UploadFilesController {
    constructor(
        private readonly uploadFilesService: UploadFilesService,
        private readonly downLoadFileProvider: DownLoadFileProvider
    ) {}
    @Patch('/:fileId/rename-file')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards()
    async renameFile(@Query('newFileName') newFileName: string, @Query('fileId') fileId: string) {
        const res = await this.uploadFilesService.renameFile(fileId, newFileName)
        return {
            message: `Đổi tên file thành công: ${res?.fileNameBase}`
        }
    }

    @Get('download-zip')
    @Auth(AuthType.Bearer)
    async downloadZip(@Res() res: Response, @Body() body: DownloadFileDto) {
        return this.downLoadFileProvider.downloadZip(body.fileNames, res)
    }

    @Patch('rename-many-files')
    @Auth(AuthType.Bearer)
    @Roles(UserRole.LECTURER)
    @UseGuards()
    async renameFiles(@Body() body: RenameFilesDto[]) {
        const res = await this.uploadFilesService.renameManyFile(body)
        return {
            message: `Đổi tên file thành công`
        }
    }

    @Get('/download-single-file')
    @Auth(AuthType.Bearer)
    async downloadSingleFile(@Res() res: Response, @Query('fileName') fileName: string) {
        return this.downLoadFileProvider.downloadSingleFile(fileName, res)
    }
}
