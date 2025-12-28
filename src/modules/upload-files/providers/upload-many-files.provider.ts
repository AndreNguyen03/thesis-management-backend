import { BadRequestException, Injectable } from '@nestjs/common'
import { ManageMinioProvider } from './manage-file-minio.provider'
import { ManageFileInDatabaseProvider } from './manage-file-database.provider'
import { UploadFilesService } from '../application/upload-files.service'
import { UploadFileDto } from '../dtos/upload-file.dtos'
import { UploadFileTypes } from '../enum/upload-files.type.enum'
import { File } from '../schemas/upload-files.schemas'

@Injectable()
export class UploadManyFilesProvider {
    constructor(
        private readonly manageMinioProvider: ManageMinioProvider,
        private readonly manageFileInDatabaseProvider: ManageFileInDatabaseProvider
    ) {}
    private async uploadFile(
        userId: string,
        file: Express.Multer.File,
        type: string = UploadFileTypes.AVATAR,
        folderName?: string
    ): Promise<File> {
        // Fix encoding cho filename tiếng Việt
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8')

        //upload file to minio storage
        const fileUrl = await this.manageMinioProvider.uploadFileToMinio(file, folderName)

        //store file information to database
        const fileData: UploadFileDto = {
            fileNameBase: originalName,
            fileUrl: fileUrl,
            mimeType: file.mimetype,
            fileType: type,
            size: file.size,
            actorId: userId
        }
        const newTopic = await this.manageFileInDatabaseProvider.storeFileData(fileData)
        return newTopic
    }

    async uploadManyFiles(
        userId: string,
        files: Express.Multer.File[],
        type: string = UploadFileTypes.DOCUMENT,
        folderName?: string
    ): Promise<File[]> {
        // Validate file types
        const allowedMimeTypes = [
            'application/pdf', // PDF
            'application/msword', // DOC
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
            'image/png', // PNG
            'image/jpeg', // JPG/JPEG
            'video/x-msvideo', //avi
            'video/mp4', //mp4
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
            'application/vnd.openxmlformats-officedocument.presentationml.presentation' // PPTX
        ]

        for (const file of files) {
            if (!allowedMimeTypes.includes(file.mimetype)) {
                throw new BadRequestException(
                    `File "${file.originalname}" không hỗ trợ. Chỉ chấp nhận: PDF, DOC, DOCX, PNG, JPG, XLSX, PPTX`
                )
            }
        }
        const totalSize = files.reduce((acc, file) => acc + file.size, 0)
        if (totalSize > 50 * 1024 * 1024) {
            throw new BadRequestException('Tổng dung lượng file tải lên vượt quá giới hạn cho phép (50MB)')
        }
        let filesData: File[] = []
        for (const file of files) {
            const fileData = await this.uploadFile(userId, file, type, folderName)
            filesData.push(fileData)
        }
        return filesData
    }
}
