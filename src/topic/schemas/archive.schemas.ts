import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../shared/base/entity/base.entity'

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
@Schema({ collection: 'archives', timestamps: true })
export class Archive extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, refPath: 'userModel', required: true, unique: true })
    userId: mongoose.Schema.Types.ObjectId

    @Prop({ type: String, required: true, enum: ['Student', 'Lecturer', 'Admin'] })
    userModel: string
    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Topic' }], default: [] })
    savedTopic: mongoose.Schema.Types.ObjectId[]

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] })
    savedLecturers: mongoose.Schema.Types.ObjectId[]
}

export const ArchiveSchema = SchemaFactory.createForClass(Archive)
