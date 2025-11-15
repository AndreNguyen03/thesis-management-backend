import { Module } from '@nestjs/common'
import { UploadFilesService } from './application/upload-files.service'
import { UploadFilesController } from './upload-files.controller'
import { UploadMinioProvider } from './providers/upload-minio.provider'
import { ManageFileInDatabaseProvider } from './providers/manage-file-database.provider'
import { FileRepository } from './repository/impl/file.repository'
import { MongooseModule } from '@nestjs/mongoose'
import { File, FilesSchema } from './schemas/upload-files.schemas'

@Module({
    providers: [
        UploadFilesService,
        UploadMinioProvider,
        ManageFileInDatabaseProvider,
        {
            provide: 'IFileRepository',
            useClass: FileRepository
        }
    ],
    controllers: [UploadFilesController],
    exports:[UploadMinioProvider],
    imports: [MongooseModule.forFeature([{ name: File.name, schema: FilesSchema }])]
})
export class UploadFilesModule {}
