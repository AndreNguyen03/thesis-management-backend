import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { BaseEntity } from '../../shared/base/entity/base.entity'
import { ThesisStats } from '../../users/schemas/lecturer.schema'
import { ThesisStatus } from '../enum/thesis-status.enum'

export class SavedUserRef {
    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
    userId: mongoose.Schema.Types.ObjectId

    @Prop({ type: Date, default: Date.now })
    savedAt: Date
}

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})

export class Thesis extends BaseEntity {
    @Prop({ required: true })
    title: string

    @Prop({ required: true })
    description: string

    @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'Lecturer', default: [] })
    lecturerIds: mongoose.Schema.Types.ObjectId[]
    @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'Student', default: [] })
    studentIds: mongoose.Schema.Types.ObjectId[]
    @Prop({ type: [SavedUserRef], default: [] })
    savedBy: SavedUserRef[]

    @Prop()
    department: string

    @Prop()
    field: string

    @Prop()
    maxStudents: number

    @Prop({ default: 0 })
    registeredStudents: number
 
    @Prop()
    deadline: Date

    @Prop({ type: [String] })
    requirements: string[]

    @Prop({ enum: ThesisStatus, default: ThesisStatus.OPEN })
    status: ThesisStatus

    @Prop()
    rating: number

    views: number
}
// total number property is 12
export const ThesisSchema = SchemaFactory.createForClass(Thesis)
