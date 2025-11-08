import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../shared/base/entity/base.entity'
import mongoose from 'mongoose'

@Schema({ collection: 'department_boards', timestamps: true })
export class FacultyBoard extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: mongoose.Schema.Types.ObjectId

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true })
    facultyId: mongoose.Schema.Types.ObjectId
}
export const FacultyBoardSchema = SchemaFactory.createForClass(FacultyBoard)
