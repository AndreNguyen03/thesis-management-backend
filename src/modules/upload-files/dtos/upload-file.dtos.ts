import { Expose } from 'class-transformer'
import { ResponseMiniLecturerDto } from '../../../users/dtos/lecturer.dto'

export class UploadFileDto {
    fileNameBase: string
    fileUrl: string
    mimeType: string
    fileType: string
    size: number
    actorId: string
}

export class GetUploadedFileDto {
    @Expose()
    _id: string
    @Expose()
    fileNameBase: string
    @Expose()
    fileUrl: string
    @Expose()
    mimeType: string
    @Expose()
    fileType: string
    @Expose()
    size: number
    @Expose()
    actor: ResponseMiniLecturerDto
    @Expose()
    created_at: string
}
export class GetDocumentsDto {
    @Expose()
    _id: string
    @Expose()
    fileNameBase: string
    @Expose()
    fileUrl: string
    @Expose()
    type: string
    @Expose()
    fileType: string
    @Expose()
    size: number
    @Expose()
    actor: ResponseMiniLecturerDto
    @Expose()
    created_at: string
}
