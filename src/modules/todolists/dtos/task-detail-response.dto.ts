import { Expose, Type } from 'class-transformer'
import { TaskPriority } from '../schemas/task.schema'

export class FileInfoResponseDto {
    @Expose()
    name: string

    @Expose()
    url: string

    @Expose()
    size: number
}

// DTO cho user info trong task
export class TaskUserDto {
    @Expose()
    _id: string

    @Expose()
    fullName: string

    @Expose()
    email: string

    @Expose()
    avatarUrl?: string
}

// DTO cho comment
export class TaskCommentDto {
    @Expose()
    _id: string

    @Expose()
    @Type(() => TaskUserDto)
    user: TaskUserDto

    @Expose()
    content: string

    @Expose()
    @Type(() => FileInfoResponseDto)
    files?: FileInfoResponseDto[]

    @Expose()
    created_at: Date

    @Expose()
    updated_at: Date

    @Expose()
    editedAt?: Date
}

// DTO cho activity log
export class TaskActivityDto {
    @Expose()
    _id: string

    @Expose()
    @Type(() => TaskUserDto)
    user: TaskUserDto

    @Expose()
    action: string

    @Expose()
    metadata?: any

    @Expose()
    created_at: Date
}

class SubtaskDto {
    @Expose()
    _id: string
    @Expose()
    title: string
    @Expose()
    isCompleted: boolean
    //@Expose()
    // description?: string
    // @Expose()
    // @Type(() => TaskUserDto)
    // assignees?: TaskUserDto[]
    // @Expose()
    // @Type(() => String)
    // priority?: TaskPriority
    // @Expose()
    // labels?: string[]
    // @Expose()
    // dueDate?: Date
    // @Expose()
    // @Type(() => TaskCommentDto)
    // comments?: TaskCommentDto[]
    // @Expose()
    // @Type(() => TaskActivityDto)
    // activities?: TaskActivityDto[]
    // @Expose()
    // @Type(() => TaskUserDto)
    // reporter?: TaskUserDto
    // @Expose()
    // created_at?: Date
    // @Expose()
    // updated_at?: Date
}
class TaskColumnDto {
    @Expose()
    _id: string
    @Expose()
    title: string // VD: "Todo", "In Progress", "Done"
    @Expose()
    color: string // Màu nền cột
    @Expose()
    @Type(() => SubtaskDto)
    items: SubtaskDto[]
}

// DTO chi tiết task (giống Jira)
export class TaskDetailDto {
    @Expose()
    _id: string

    @Expose()
    groupId: string

    @Expose()
    milestoneId?: string

    @Expose()
    title: string

    @Expose()
    description: string

    @Expose()
    status: string

    @Expose()
    priority: TaskPriority

    @Expose()
    labels: string[]

    @Expose()
    dueDate?: Date

    @Expose()
    @Type(() => TaskUserDto)
    assignees: TaskUserDto[]

    @Expose()
    @Type(() => TaskCommentDto)
    comments: TaskCommentDto[]

    @Expose()
    @Type(() => TaskActivityDto)
    activities: TaskActivityDto[]

    @Expose()
    @Type(() => TaskUserDto)
    createdBy: TaskUserDto

    @Expose()
    @Type(() => TaskUserDto)
    reporter: TaskUserDto

    @Expose()
    created_at: Date

    @Expose()
    updated_at: Date
    @Expose()
    @Type(() => TaskColumnDto)
    columns: TaskColumnDto[]
}
