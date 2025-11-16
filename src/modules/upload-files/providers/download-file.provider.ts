import { Injectable } from '@nestjs/common'
import type { Response } from 'express'
import { ManageMinioProvider } from './manage-file-minio.provider'
import { DownloadFileDto } from '../dtos/download-file.dtos'

@Injectable()
export class DownLoadFileProvider {
    constructor(private readonly manageMinioProvider: ManageMinioProvider) {}
    async downloadZip(body: DownloadFileDto, res: Response) {
        await this.manageMinioProvider.createZipStream(body, res)
    }
}
