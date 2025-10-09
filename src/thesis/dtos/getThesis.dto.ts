import mongoose, { mongo } from 'mongoose'
import { ThesisStatus } from '../enum/thesis-status.enum'
import { IsEnum } from 'class-validator'
import { de } from '@faker-js/faker/.'
export class GetThesisResponseDto {
    _id: string
    title: string

    description: string

    registrantIds: mongoose.Schema.Types.ObjectId[]

    department: string

    field: string

    maxStudents: number

    registeredStudents: number

    deadline: Date

    requirements: string[]

    @IsEnum({ ThesisStatus, default: ThesisStatus.OPEN })
    status: ThesisStatus

    rating: number
    updatedAt: Date
    createdAt: Date

    views: number
}
