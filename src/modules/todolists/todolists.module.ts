import { Module } from '@nestjs/common'
import { TodolistsController } from './todolists.controller'
import { TasksService } from './application/tasks.service'
import { TaskRepository } from './repository/impl/task.repository'
import { MongooseModule } from '@nestjs/mongoose'
import { Task, TaskSchema } from './schemas/task.schema'

@Module({
    providers: [
        TasksService,
        {
            provide: 'ITaskRepository',
            useClass: TaskRepository
        }
    ],
    controllers: [TodolistsController],
    imports: [MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema   }])]
})
export class TodolistsModule {}
