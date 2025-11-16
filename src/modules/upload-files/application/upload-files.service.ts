import { Injectable } from '@nestjs/common'
import { ManageFileInDatabaseProvider } from '../providers/manage-file-database.provider'
import { UploadFileDto } from '../dtos/upload-file.dtos'

@Injectable()
export class UploadFilesService {
    constructor(private readonly manageFileInDatabaseProvider: ManageFileInDatabaseProvider) {}
}
