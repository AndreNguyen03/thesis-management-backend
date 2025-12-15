import { Inject, Injectable, RequestTimeoutException } from '@nestjs/common'
import { BaseServiceAbstract } from '../../../shared/base/service/base.service.abstract'
import { File } from '../schemas/upload-files.schemas'
import { IFileRepository } from '../repository/file.repository.interface'
import { UploadFileDto } from '../dtos/upload-file.dtos'
import { ManageMinioProvider } from './manage-file-minio.provider'
import * as path from 'path'
@Injectable()
export class ManageFileInDatabaseProvider extends BaseServiceAbstract<File> {
    constructor(@Inject('IFileRepository') private fileRepositoryInterface: IFileRepository) {
        super(fileRepositoryInterface)
    }
    async storeFileData(fileData: UploadFileDto): Promise<File> {
        try {
            let flag = false
            let index = 0
            let finalName = fileData.fileNameBase
            let name = fileData.fileNameBase.split('.')[0]
            let extension = path.extname(fileData.fileNameBase)
            while (!flag) {
                const existingFile = await this.fileRepositoryInterface.findByCondition({
                    fileNameBase: finalName,
                    mimeType: fileData.mimeType,
                    deleted_at: null
                })
                if (existingFile && existingFile.length > 0) {
                    name = `${name} (${++index})`
                    finalName = `${name}${extension}`
                    continue
                }
                flag = true
            }
            fileData.fileNameBase = finalName
            const fileRecord = await this.fileRepositoryInterface.create(fileData)
            return fileRecord
        } catch (error) {
            console.error('Error storing file data in database:', error)
            throw new RequestTimeoutException('Lỗi khi lưu thông tin file vào cơ sở dữ liệu')
        }
    }
    async deleteFileData(fileId: string): Promise<string> {
        try {
            const deletedFile = await this.fileRepositoryInterface.deleteOne(fileId)
            return deletedFile
        } catch (error) {
            console.error('Error deleting file data from database:', error)
            throw new RequestTimeoutException('Lỗi khi xóa thông tin file khỏi cơ sở dữ liệu')
        }
    }
    async deleteFilesData(fileIds: string[]): Promise<string[]> {
        try {
            const result = await this.fileRepositoryInterface.deleteMany(fileIds)
            return result
        } catch (error) {
            console.error('Error deleting file data from database:', error)
            throw new RequestTimeoutException('Lỗi khi xóa thông tin file khỏi cơ sở dữ liệu')
        }
    }
}
