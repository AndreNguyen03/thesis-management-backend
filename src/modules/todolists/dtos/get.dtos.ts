import { Expose, Type } from 'class-transformer'
class SubtaskDto {
    @Expose()
    _id: string
    @Expose()
    title: string // VD: "Nghiên cứu UI/UX"
    @Expose()
    isCompleted: boolean
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

export class TaskDto {
    @Expose()
    _id: string
    @Expose()
    groupId: string
    @Expose()
    title: string   
    @Expose()
    description: string
    @Expose()
    @Type(() => TaskColumnDto)
    columns: TaskColumnDto[]
}
