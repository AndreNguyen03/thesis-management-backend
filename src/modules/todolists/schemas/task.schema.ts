// schemas/task.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose, { HydratedDocument, Types } from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { Group } from '../../groups/schemas/groups.schemas'
import { User } from '../../../users/schemas/users.schema'
import { TaskColumnTitleEnum } from '../enum/taskcolumn.enum'

export type Status = 'Todo' | 'In Progress' | 'Done'
export const StatusOptions = {
    TODO: 'Todo',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done'
}

export enum TaskPriority {
    HIGHEST = 'Highest',
    HIGH = 'High',
    MEDIUM = 'Medium',
    LOW = 'Low',
    LOWEST = 'Lowest'
}

// FileInfo Schema - lưu thông tin file
@Schema({ _id: false })
export class FileInfo {
    @Prop({ default: '' })
    name: string

    @Prop({ default: '' })
    url: string

    @Prop({ default: 0 })
    size: number
}

// Comment Schema - giống Jira
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
export class TaskComment extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
    userId: string

    @Prop({ required: true })
    content: string // Có thể là rich text HTML

    @Prop({ type: [FileInfo], default: [] })
    files?: FileInfo[] // Mảng file info với đầy đủ thông tin

    @Prop({ type: Date })
    editedAt?: Date
}
const TaskCommentSchema = SchemaFactory.createForClass(TaskComment)

// Activity Log Schema - theo dõi lịch sử thay đổi
@Schema({
    timestamps: {
        createdAt: 'created_at'
    }
})
export class TaskActivity extends BaseEntity {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
    userId: string

    @Prop({ required: true })
    action: string // VD: "changed status", "added comment", "assigned user", "updated description"

    @Prop({ type: mongoose.Schema.Types.Mixed })
    metadata?: any // Lưu thông tin thêm về thay đổi (oldValue, newValue, etc.)
}
const TaskActivitySchema = SchemaFactory.createForClass(TaskActivity)
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

    @Prop({ default: '' })
    description: string

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: User.name }], default: [] })
    assignees: string[]

    @Prop({ type: String, enum: TaskPriority, default: TaskPriority.MEDIUM })
    priority: TaskPriority

    @Prop({ type: [String], default: [] })
    labels: string[]

    @Prop({ type: Date, default: null })
    dueDate: Date | null

    @Prop({ type: [TaskCommentSchema], default: [] })
    comments: TaskComment[]

    @Prop({ type: [TaskActivitySchema], default: [] })
    activities: TaskActivity[]

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
    reporter: string
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

    @Prop({ default: '' })
    description: string // Rich text HTML content

    @Prop({ type: [TaskColumnSchema], default: [] })
    columns: TaskColumn[]

    @Prop({ default: 'Todo', type: String, enum: ['Todo', 'In Progress', 'Done'] })
    status: Status

    // === Jira-like Features ===

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: User.name }], default: [] })
    assignees: string[] // Danh sách người được assign

    @Prop({ type: String, enum: TaskPriority, default: TaskPriority.MEDIUM })
    priority: TaskPriority

    @Prop({ type: [String], default: [] })
    labels: string[] // Tags/labels

    @Prop({ type: Date, default: null })
    dueDate: Date | null

    @Prop({ type: [TaskCommentSchema], default: [] })
    comments: TaskComment[] // Danh sách comments

    @Prop({ type: [TaskActivitySchema], default: [] })
    activities: TaskActivity[] // Lịch sử thay đổi

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
    createdBy: string // Người tạo task

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
    reporter: string // Người báo cáo (giống Jira)
}

export const TaskSchema = SchemaFactory.createForClass(Task)
// Index: Tìm task theo Topic, sắp xếp mới nhất
TaskSchema.index({ topicId: 1, createdAt: -1 })
