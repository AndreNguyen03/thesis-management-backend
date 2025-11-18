import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../shared/base/entity/base.entity'
import mongoose, { HydratedDocument } from 'mongoose'
import { User } from './users.schema'

@Schema({
    collection: 'faculty_boards',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    },
    _id: false
})
export class FacultyBoard extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: mongoose.Schema.Types.ObjectId

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true })
    facultyId: mongoose.Schema.Types.ObjectId
}
export const FacultyBoardSchema = SchemaFactory.createForClass(FacultyBoard)
