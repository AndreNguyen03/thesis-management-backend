import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { UploadFileTypes } from '../enum/upload-files.type.enum'
import mongoose, { mongo } from 'mongoose'
import { User } from '../../../users/schemas/users.schema'

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    },
    collection: 'files'
})
export class File extends BaseEntity {
    @Prop({ required: true })
    fileNameBase: string
    @Prop({ required: true })
    //sử dụng cho việc tải và xóa file trên minio
    fileUrl: string
    @Prop({ required: true, type: String })
    mimeType: string
    @Prop({ required: true, type: String, enum: UploadFileTypes })
    fileType: string
    @Prop({ required: true, type: Number })
    size: number
    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: User.name })
    actorId: string
}
export const FilesSchema = SchemaFactory.createForClass(File)
