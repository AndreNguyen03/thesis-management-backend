import { BadRequestException, Injectable } from '@nestjs/common'
import { ManageMinioProvider } from './manage-file-minio.provider'
import { ManageFileInDatabaseProvider } from './manage-file-database.provider'
import { UploadFileDto } from '../dtos/upload-file.dtos'

@Injectable()
export class UploadAvatarProvider {
    constructor(
        private readonly manageMinioProvider: ManageMinioProvider,
        private readonly manageFileInDatabaseProvider: ManageFileInDatabaseProvider
    ) {}
    async uploadAvatar(userId: string, file: Express.Multer.File): Promise<string> {
        const allowedTypes = ['image/jpeg', 'image/png']
        if (!allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException('Chỉ cho phép upload file ảnh .jpeg và .png)')
        }
        if (file.size > 10 * 1024 * 1024) {
            throw new BadRequestException('Kích thước file vượt quá giới hạn cho phép (10MB)')
        }
        //upload file to minio storage
        const fileName = await this.manageMinioProvider.uploadFileToMinio(file)
        //store file information to database
        const fileData: UploadFileDto = {
            fileNameBase: file.originalname,
            fileName: fileName,
            mimeType: file.mimetype,
            fileType: 'avatar',
            size: file.size,
            actorId: userId
        }
        await this.manageFileInDatabaseProvider.storeFileData(fileData)
        //avatar name
        return fileName
    }
}
