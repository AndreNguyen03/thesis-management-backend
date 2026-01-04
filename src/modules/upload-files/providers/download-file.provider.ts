import { Injectable } from '@nestjs/common'
import type { Response } from 'express'
import { ManageMinioProvider } from './manage-file-minio.provider'
import { DownloadFileDto } from '../dtos/download-file.dtos'

@Injectable()
export class DownLoadFileProvider {
    constructor(private readonly manageMinioProvider: ManageMinioProvider) {}
    async downloadZip(fileNames: string[], res: Response, topicName?: string) {
        await this.manageMinioProvider.createZipStream(fileNames, res, topicName)
    }
    async downloadZipWithPrefix(prefixes: string[], res: Response, topicName?: string) {
        await this.manageMinioProvider.createZipStreamWithFolders(prefixes, res, topicName)
    }

    async downloadSingleFile(fileName:string, res: Response){
        await this.manageMinioProvider.downloadSingleFile(fileName, res)
    }
}
