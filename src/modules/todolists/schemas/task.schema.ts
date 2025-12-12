// schemas/task.schema.ts

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import mongoose from "mongoose"

// 1. Định nghĩa Subtask Schema (Embedded)
@Schema({ _id: true }) // _id: true để mỗi subtask có ID riêng, dễ update
export class Subtask {
    @Prop({ required: true })
    title: string

    @Prop({ default: false })
    isCompleted: boolean
}

// 2. Main Task Schema
@Schema({ timestamps: true, collection: 'tasks' })
export class Task {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true, index: true })
    topicId: mongoose.Schema.Types.ObjectId

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'ToDoList', required: true, index: true })
    todoListId: mongoose.Schema.Types.ObjectId // Thuộc cột nào (Backlog, Doing, Done)
    @Prop({ required: true })
    title: string

    @Prop()
    description: string

    @Prop({ enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' })
    priority: string

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
    assignees: mongoose.Schema.Types.ObjectId[] // Một task có thể giao cho nhiều sinh viên

    @Prop()
    dueDate: Date

    // EMBEDDED DOCUMENT: Subtasks nằm gọn trong Task
    @Prop({ type: [Subtask], default: [] })
    subtasks: Subtask[]

    @Prop({ type: Number, required: true }) // Để sort thứ tự task trong 1 cột
    position: number

    // Computed field: Cache số lượng comment/attachment để hiển thị ngoài Card mà không cần join
    @Prop({ default: 0 })
    commentsCount: number
}

export const TaskSchema = SchemaFactory.createForClass(Task)
// Compound Index cực quan trọng cho Kanban Board:
// "Tìm tất cả task của Topic A, trong cột B, sắp xếp theo vị trí"
TaskSchema.index({ topicId: 1, todoListId: 1, position: 1 })
