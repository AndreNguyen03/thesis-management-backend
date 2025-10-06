import { Prop } from '@nestjs/mongoose'
import mongoose from 'mongoose'

export class BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId })
    _id?: mongoose.Schema.Types.ObjectId // Sau này sẽ dùng với class-transformer để serialize dữ liệu response

    @Prop({ default: null })
    deleted_at: Date // Dùng cho soft delete
}
