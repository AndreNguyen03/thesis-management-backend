import { Injectable } from '@nestjs/common'
import { UploadMinioProvider } from '../providers/upload-minio.provider'
import { ManageFileInDatabaseProvider } from '../providers/manage-file-database.provider'
import { UploadFileDto } from '../dtos/UploadFile.dtos'

@Injectable()
export class UploadFilesService {
    constructor(
        private readonly uploadMinioProvider: UploadMinioProvider,
        private readonly manageFileInDatabaseProvider: ManageFileInDatabaseProvider
    ) {}
    async uploadFile(file: Express.Multer.File) {
        const allowedTypes = ['image/jpeg', 'image/png']
        if (!allowedTypes.includes(file.mimetype)) {
            throw new Error('Chỉ cho phép upload file ảnh .jpeg và .png)')
        }
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('Kích thước file vượt quá giới hạn cho phép (10MB)')
        }
        //upload file to minio storage
        const fileName = await this.uploadMinioProvider.uploadFileToMinio(file)
        //store file information to database
        const fileData: UploadFileDto = {
            fileNameBase: file.originalname,
            fileName: fileName,
            type: file.mimetype,
            size: file.size
        }
        await this.manageFileInDatabaseProvider.storeFileData(fileData)
    }
}
