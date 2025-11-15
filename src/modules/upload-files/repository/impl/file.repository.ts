import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { File } from '../../schemas/upload-files.schemas'
import { IFileRepository } from '../file.repository.interface'
import { Model } from 'mongoose'

export class FileRepository extends BaseRepositoryAbstract<File> implements IFileRepository {
    constructor(@InjectModel(File.name) private fileModel: Model<File>) {
        super(fileModel)
    }
}
