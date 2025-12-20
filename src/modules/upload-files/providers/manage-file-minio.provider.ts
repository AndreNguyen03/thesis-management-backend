import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client } from 'minio'
import { InjectMinio } from 'nestjs-minio'
import { v4 as uuidv4 } from 'uuid'
import * as path from 'path'
import * as archiver from 'archiver'
import type { Response } from 'express'
import { DownloadFileDto } from '../dtos/download-file.dtos'

@Injectable()
export class ManageMinioProvider {
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
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8')
        // extract file name
        let name = originalName.split('.')[0]
        // Remove spaces in the file name
        name = name.replace(/\s/g, '').trim()
        // extract file extension
        let extension = path.extname(file.originalname)
        // Generate a timestamp
        let timeStamp = new Date().getTime().toString().trim()
        // Return new fileName
        return `${name}-${timeStamp}-${uuidv4()}${extension}`
    }
    async deleteMinioFile(fileName: string): Promise<void> {
        try {
            await this.minioClient.removeObject(this.bucketName, fileName)
        } catch (error) {
            console.log('Error deleting file from MinIO:', error)
            throw new BadRequestException('Lỗi khi xóa file khỏi hệ thống')
        }
    }
    async deleteMinioFiles(fileNames: string[]): Promise<void> {
        try {
            await this.minioClient.removeObjects(this.bucketName, fileNames)
        } catch (error) {
            console.log('Error deleting files from MinIO:', error)
            throw new BadRequestException(`Lỗi khi xóa ${fileNames.length} file khỏi hệ thống`)
        }
    }

    // createZipStream
    async createZipStream(fileNames: string[], res: Response, topicName: string = 'Tai-lieu'): Promise<void> {
        const archive = archiver('zip', { zlib: { level: 9 } })
        const zipFileName = `${topicName}-${new Date().getTime()}.zip`
        res.setHeader('Content-Type', 'application/zip')
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`)
        archive.pipe(res)

        try {
            //Thêm tuần tự các file vào archive
            for (const fileName of fileNames) {
                const fileStream = await this.minioClient.getObject(this.bucketName, fileName)
                archive.append(fileStream, { name: path.basename(fileName) })
            }
        } catch (error) {
            console.log('Error fetching files from MinIO for zipping:', error)
            if (error.code === 'NoSuchKey') {
                res.status(400).json({ message: 'Một hoặc nhiều file không tồn tại trong hệ thống' })
            }
        } finally {
            await archive.finalize()
        }
    }
}
