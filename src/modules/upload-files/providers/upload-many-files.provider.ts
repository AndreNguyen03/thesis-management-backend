import { BadRequestException, Injectable } from '@nestjs/common'
import { ManageMinioProvider } from './manage-file-minio.provider'
import { ManageFileInDatabaseProvider } from './manage-file-database.provider'
import { UploadFilesService } from '../application/upload-files.service'
import { UploadFileDto } from '../dtos/upload-file.dtos'
import { UploadFileTypes } from '../enum/upload-files.type.enum'

@Injectable()
export class UploadManyFilesProvider {
    constructor(
        private readonly manageMinioProvider: ManageMinioProvider,
        private readonly manageFileInDatabaseProvider: ManageFileInDatabaseProvider
    ) {}
    private async uploadFile(
        userId: string,
        file: Express.Multer.File,
        type: string = UploadFileTypes.AVATAR
    ): Promise<string> {
        const allowedTypes = [
            'application/pdf', //pdf
            'application/msword', //doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', //docx
            'image/jpeg', //jpeg
            'image/png', //png
            'application/vnd.ms-powerpoint', //ppt
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', //pptx
            'application/vnd.ms-excel', //xls
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', //xlsx,
            'video/x-msvideo', //avi
            'video/mp4' //mp4
        ]

        if (!allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException('Định dạng file không đưuọc hỗ trợ)')
        }
        if (file.size > 100 * 1024 * 1024) {
            throw new BadRequestException('Kích thước file vượt quá giới hạn cho phép (100MB)')
        }
        //upload file to minio storage
        const fileName = await this.manageMinioProvider.uploadFileToMinio(file)
        //store file information to database
        const fileData: UploadFileDto = {
            fileNameBase: file.originalname,
            fileUrl: fileName,
            mimeType: file.mimetype,
            fileType: type,
            size: file.size,
            actorId: userId
        }
        const newTopic = await this.manageFileInDatabaseProvider.storeFileData(fileData)
        return newTopic._id.toString()
    }
    async uploadManyFiles(userId: string, files: Express.Multer.File[], type: string = UploadFileTypes.DOCUMENT): Promise<string[]> {
        //kiểm tra dung lượng của tất cả các file được upload
        const totalSize = files.reduce((acc, file) => acc + file.size, 0)
        if (totalSize > 1024 * 1024 * 1024) {
            throw new BadRequestException('Tổng kích thước các file vượt quá giới hạn cho phép (1GB)')
        }
        let ids: string[] = []
        for (const file of files) {
            const id = await this.uploadFile(userId, file, type)
            ids.push(id)
        }
        return ids
    }
}
