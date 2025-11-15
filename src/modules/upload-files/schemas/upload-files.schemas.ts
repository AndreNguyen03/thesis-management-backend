import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'

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
    filePath: string
    @Prop({ required: true, type: String })
    type: string
    @Prop({ required: true, type: Number })
    size: number
}
export const FilesSchema = SchemaFactory.createForClass(File)
