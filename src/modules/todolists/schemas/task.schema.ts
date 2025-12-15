// schemas/task.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose, { HydratedDocument, Types } from 'mongoose'
import { Topic } from '../../topics/schemas/topic.schemas'
import { User } from '../../../users/schemas/users.schema'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { Group } from '../../groups/schemas/groups.schemas'
import { TaskColumnTitleEnum } from '../enum/taskcolumn.enum'

// -----------------------------------------
// LEVEL 3: SUBTASK (Item nhỏ nhất - VD: "Nghiên cứu UI/UX")
// -----------------------------------------
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
}) // _id: true là BẮT BUỘC để React Key hoạt động khi Drag & Drop
export class Subtask extends BaseEntity {
    @Prop({ required: true })
    title: string
    // Trường này có thể dư thừa nếu trạng thái phụ thuộc vào Cột,
    // nhưng nên giữ để tính toán Progress Bar (VD: 33%) dễ hơn.
    @Prop({ default: false })
    isCompleted: boolean
    newSubTask: Types.ObjectId
    // @Prop({ type: [{ type: Types.ObjectId, ref: User.name }] })
    // assignees: Types.ObjectId[]
}
const SubtaskSchema = SchemaFactory.createForClass(Subtask)

// -----------------------------------------
// LEVEL 2: TODOLIST (Các cột: Todo, In Progress, Done)
// -----------------------------------------
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
export class TaskColumn extends BaseEntity {
    @Prop({ required: true, enum: TaskColumnTitleEnum })
    title: string // VD: "Todo", "In Progress", "Done"

    @Prop({ default: '#f1f2f6' })
    color: string // Màu nền cột

    // Nhúng mảng Subtask vào đây
    @Prop({ type: [SubtaskSchema], default: [] })
    items: Subtask[]
}
const TaskColumnSchema = SchemaFactory.createForClass(TaskColumn)

// -----------------------------------------
// LEVEL 1: TASK (Document chính - VD: "Thiết kế Wireframe Trang chủ")
// -----------------------------------------
export type TaskDocument = HydratedDocument<Task>

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    },
    collection: 'tasks'
})
export class Task extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Group.name, required: true, index: true })
    groupId: string

    @Prop({ required: true })
    title: string

    @Prop()
    description: string

    // @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
    // assignees: Types.ObjectId[] // Người chịu trách nhiệm Task lớn
    // Mảng các Cột (Columns) chứa Subtask
    @Prop({ type: [TaskColumnSchema], default: [] })
    columns: TaskColumn[]
    // @Prop({ default: 0 })
    // commentCount: number
}

export const TaskSchema = SchemaFactory.createForClass(Task)
// Index: Tìm task theo Topic, sắp xếp mới nhất
TaskSchema.index({ topicId: 1, createdAt: -1 })
