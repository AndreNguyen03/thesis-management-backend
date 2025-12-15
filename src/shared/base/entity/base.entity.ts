import { Prop } from '@nestjs/mongoose'
import mongoose from 'mongoose'

export class BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
    _id: mongoose.Schema.Types.ObjectId
    @Prop({ default: null, type: Date })
    deleted_at: Date | null // Dùng cho soft delete
}
