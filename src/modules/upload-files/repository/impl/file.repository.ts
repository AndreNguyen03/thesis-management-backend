import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { File } from '../../schemas/upload-files.schemas'
import { IFileRepository } from '../file.repository.interface'
import { Model } from 'mongoose'
import { RequestTimeoutException } from '@nestjs/common'
import { FileNotFoundException } from '../../../../common/exceptions/files-exceptions'

export class FileRepository extends BaseRepositoryAbstract<File> implements IFileRepository {
    constructor(@InjectModel(File.name) private fileModel: Model<File>) {
        super(fileModel)
    }
    async deleteOne(fileId: string): Promise<string> {
        try {
            const fileExists = await this.fileModel
                .findOneAndUpdate({ _id: fileId }, { $set: { deleted_at: new Date() } }, { new: true })
                .exec()
            if (!fileExists) {
                throw new FileNotFoundException()
            }
            return fileExists.fileNameBase
        } catch (error) {
            console.error('Error deleting file:', error)
            throw new RequestTimeoutException('Lỗi khi xóa file khỏi cơ sở dữ liệu')
        }
    }
    async deleteMany(fileIds: string[]): Promise<string[]> {
        try {
            const res = await this.fileModel.updateMany({ _id: { $in: fileIds } }, { $set: { deleted_at: new Date() } })
            const deletedFileNames: string[] = []
            if (res.modifiedCount > 0) {
                const deletedFiles = await this.fileModel
                    .find({ _id: { $in: fileIds } })
                    .select('fileNameBase')
                    .exec()
                deletedFiles.forEach((file) => {
                    deletedFileNames.push(file.fileNameBase)
                })
            }
            return deletedFileNames
        } catch (error) {
            console.error('Error deleting multiple files:', error)
            throw new RequestTimeoutException('Lỗi khi xóa nhiều file khỏi cơ sở dữ liệu')
        }
    }
}
