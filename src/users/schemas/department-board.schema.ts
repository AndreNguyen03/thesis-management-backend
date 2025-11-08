import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../shared/base/entity/base.entity'
import mongoose from 'mongoose'

@Schema({ collection: 'department_boards', timestamps: true })
export class DepartmentBoard extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: mongoose.Schema.Types.ObjectId
}
export const DepartmentBoardSchema = SchemaFactory.createForClass(DepartmentBoard)
