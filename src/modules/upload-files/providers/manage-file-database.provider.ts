import { Inject, Injectable, RequestTimeoutException } from '@nestjs/common'
import { BaseServiceAbstract } from '../../../shared/base/service/base.service.abstract'
import { File } from '../schemas/upload-files.schemas'
import { IFileRepository } from '../repository/file.repository.interface'
import { UploadFileDto } from '../dtos/UploadFile.dtos'

@Injectable()
export class ManageFileInDatabaseProvider extends BaseServiceAbstract<File> {
    constructor(@Inject('IFileRepository') private fileRepositoryInterface: IFileRepository) {
        super(fileRepositoryInterface)
    }
    async storeFileData(fileData: UploadFileDto): Promise<File> {
        try {
            const fileRecord = await this.fileRepositoryInterface.create(fileData)
            return fileRecord
        } catch (error) {
            console.error('Error storing file data in database:', error)
            throw new RequestTimeoutException('Lỗi khi lưu thông tin file vào cơ sở dữ liệu')
        }
    }
}
