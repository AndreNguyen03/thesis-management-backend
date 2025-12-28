// schemas/task.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose, { HydratedDocument, Types } from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { Group } from '../../groups/schemas/groups.schemas'
import { TaskColumnTitleEnum } from '../enum/taskcolumn.enum'

export type Status = 'Todo' | 'In Progress' | 'Done'
export const StatusOptions = {
    TODO: 'Todo',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done'
}
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
}) // _id: true là BẮT BUỘC để React Key hoạt động khi Drag & Drop
export class Subtask extends BaseEntity {
    @Prop({ required: true })
    title: string
    @Prop({ default: false })
    isCompleted: boolean
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

    @Prop({ type: [SubtaskSchema], default: [] })
    items: Subtask[]
}
const TaskColumnSchema = SchemaFactory.createForClass(TaskColumn)

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

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', required: false, index: true, default: null })
    milestoneId: string | null

    @Prop({ required: true })
    title: string

    @Prop()
    description: string

    @Prop({ type: [TaskColumnSchema], default: [] })
    columns: TaskColumn[]

    @Prop({ default: 'Todo', type: String, enum: ['Todo', 'In Progress', 'Done'] })
    status: Status
}

export const TaskSchema = SchemaFactory.createForClass(Task)
// Index: Tìm task theo Topic, sắp xếp mới nhất
TaskSchema.index({ topicId: 1, createdAt: -1 })
