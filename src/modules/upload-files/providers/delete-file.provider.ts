import { Injectable } from '@nestjs/common'
import { ManageFileInDatabaseProvider } from './manage-file-database.provider'
import { ManageMinioProvider } from './manage-file-minio.provider'
@Injectable()
export class DeleteFileProvider {
    constructor(
        private readonly manageFileInDatabaseProvider: ManageFileInDatabaseProvider,
        private readonly manageMinioProvider: ManageMinioProvider
    ) {}

    async deleteMany(fileIds: string[]) {
        const deletedFileNames = await this.manageFileInDatabaseProvider.deleteFilesData(fileIds)
        await this.manageMinioProvider.deleteMinioFiles(deletedFileNames)
    }

    async deleteOne(fileId: string) {
        const deletedFileName = await this.manageFileInDatabaseProvider.deleteFileData(fileId)
        await this.manageMinioProvider.deleteMinioFile(deletedFileName)
    }
}
