import { Inject, Injectable } from '@nestjs/common'
import { ManageFileInDatabaseProvider } from '../providers/manage-file-database.provider'
import { UploadFileDto } from '../dtos/upload-file.dtos'
import { IFileRepository } from '../repository/file.repository.interface'
import { BaseServiceAbstract } from '../../../shared/base/service/base.service.abstract'
import { File } from '../schemas/upload-files.schemas'
import { RenameFilesDto } from '../dtos/rename-file.dtos'

@Injectable()
export class UploadFilesService extends BaseServiceAbstract<File> {
    constructor(
        private readonly manageFileInDatabaseProvider: ManageFileInDatabaseProvider,
        @Inject('IFileRepository') private readonly fileRepositoryInterface: IFileRepository
    ) {
        super(fileRepositoryInterface)
    }

    async renameFile(fileId: string, newFileName: string): Promise<File | null> {
        const decodedName = decodeURIComponent(newFileName)
        return await this.findOneAndUpdate({ _id: fileId }, { fileNameBase: decodedName })
    }
    async renameManyFile(body: RenameFilesDto[]) {
        for (const file of body) {
            const decodedName = decodeURIComponent(file.newFileName)
            await this.findOneAndUpdate({ _id: file.fileId }, { fileNameBase: decodedName })
        }
    }
}
