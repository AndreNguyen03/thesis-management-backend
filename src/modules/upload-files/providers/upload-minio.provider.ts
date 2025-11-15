import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client } from 'minio'
import { InjectMinio } from 'nestjs-minio'
import { v4 as uuidv4 } from 'uuid'
import * as path from 'path'

@Injectable()
export class UploadMinioProvider {
    private bucketName: string
    constructor(
        @InjectMinio() private readonly minioClient: Client,
        private readonly configService: ConfigService
    ) {
        this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME')!
    }
    async uploadFileToMinio(file: Express.Multer.File): Promise<string> {
        const metaData = {
            'Content-Type': file.mimetype
        }
        try {
            const fileName = this.generateFileName(file)
            await this.minioClient.putObject(this.bucketName, fileName, file.buffer, file.size, metaData)
            return fileName
        } catch (error) {
            console.log('Error uploading file to MinIO:', error)
            throw new BadRequestException('Lỗi khi tải file lên hệ thống')
        }
    }
    private generateFileName(file: Express.Multer.File): string {
        // extract file name
        let name = file.originalname.split('.')[0]
        // Remove spaces in the file name
        name = name.replace(/\s/g, '').trim()
        // extract file extension
        let extension = path.extname(file.originalname)
        // Generate a timestamp
        let timeStamp = new Date().getTime().toString().trim()
        // Return new fileName
        return `${name}-${timeStamp}-${uuidv4()}${extension}`
    }
}
