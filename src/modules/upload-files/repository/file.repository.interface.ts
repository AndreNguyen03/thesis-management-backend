import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { GetUploadedFileDto, UploadFileDto } from '../dtos/upload-file.dtos'
import { File } from '../schemas/upload-files.schemas'

export interface IFileRepository extends BaseRepositoryInterface<File> {
    deleteMany(fileIds: string[]): Promise<string[]>
    deleteOne(fileId: string): Promise<string>

}
