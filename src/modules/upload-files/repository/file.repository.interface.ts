import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { UploadFileDto } from '../dtos/UploadFile.dtos'
import { File } from '../schemas/upload-files.schemas'

export interface IFileRepository extends BaseRepositoryInterface<File> {}
