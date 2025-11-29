import { Module } from '@nestjs/common'
import { UploadFilesService } from './application/upload-files.service'
import { UploadFilesController } from './upload-files.controller'
import { ManageMinioProvider } from './providers/manage-file-minio.provider'
import { ManageFileInDatabaseProvider } from './providers/manage-file-database.provider'
import { FileRepository } from './repository/impl/file.repository'
import { MongooseModule } from '@nestjs/mongoose'
import { File, FilesSchema } from './schemas/upload-files.schemas'
import { UploadAvatarProvider } from './providers/upload-avatar.provider'
import { UploadManyFilesProvider } from './providers/upload-many-files.provider'
import { DeleteFileProvider } from './providers/delete-file.provider'
import { DownLoadFileProvider } from './providers/download-file.provider'

@Module({
    providers: [
        UploadFilesService,
        ManageMinioProvider,
        ManageFileInDatabaseProvider,
        {
            provide: 'IFileRepository',
            useClass: FileRepository
        },
        UploadAvatarProvider,
        UploadManyFilesProvider,
        DeleteFileProvider,
        DownLoadFileProvider
    ],
    controllers: [UploadFilesController],
    exports: [
        UploadAvatarProvider,
        ManageFileInDatabaseProvider,
        UploadManyFilesProvider,
        DeleteFileProvider,
        DownLoadFileProvider
    ],
    imports: [MongooseModule.forFeature([{ name: File.name, schema: FilesSchema }])]
})
export class UploadFilesModule {}
