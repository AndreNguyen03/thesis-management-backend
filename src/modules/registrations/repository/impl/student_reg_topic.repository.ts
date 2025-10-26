import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import mongoose, { Model } from 'mongoose'
import { UserRole } from '../../../../auth/enum/user-role.enum'
import { RegistrationStatus, TopicStatus } from '../../../topics/enum'
import { Student } from '../../../../users/schemas/student.schema'
import { NotFoundException } from '@nestjs/common'
import {
    StudentAlreadyRegisteredException,
    TopicNotFoundException
} from '../../../../common/exceptions/thesis-exeptions'
import {
    RegistrationNotFoundException,
    TopicIsFullRegisteredException
} from '../../../../common/exceptions/registration-exeptions'
import { GetRegistrationDto } from '../../../topics/dtos/registration/get-registration.dto'
import { plainToInstance } from 'class-transformer'
import { getUserModelFromRole } from '../../../topics/utils/get-user-model'
import { StudentRegTopicRepositoryInterface } from '../student-reg-topic.repository.interface'
import { StudentRegisterTopic } from '../../schemas/ref_students_topics.schemas'
import { Topic } from '../../../topics/schemas/topic.schemas'

export class StudentRegTopicRepository
    extends BaseRepositoryAbstract<StudentRegisterTopic>
    implements StudentRegTopicRepositoryInterface
{
    constructor(
        @InjectModel(StudentRegisterTopic.name)
        private readonly studentRegTopicModel: Model<StudentRegisterTopic>,
        @InjectModel(Topic.name)
        private readonly topicModel: Model<Topic>
    ) {
        super(studentRegTopicModel)
    }
    async checkFullSlot(maxStudents: number, topicId: string): Promise<boolean> {
        const registeredCount = await this.studentRegTopicModel.countDocuments({
            topicId: topicId,
            deleted_at: null
        })
        return registeredCount === maxStudents
    }
    async createRegistrationWithStudents(topicId: string, studentIds: string[]): Promise<string[]> {
        const topic = await this.topicModel.findOne({ _id: topicId, deleted_at: null }).exec()
        //topic not found or deleted
        if (!topic) {
            throw new TopicNotFoundException()
        }
        const createdStudentRegs = await this.studentRegTopicModel.insertMany(
            studentIds.map((studentId) => ({
                topicId: new mongoose.Types.ObjectId(topicId),
                studentId: new mongoose.Types.ObjectId(studentId),
                status: RegistrationStatus.SUCCESS
            }))
        )
        const populated = await this.studentRegTopicModel.populate(createdStudentRegs, {
            path: 'studentId',
            select: 'name'
        })
        return populated.map((d) => (d.studentId as any)?.name).filter(Boolean) as string[]
    }

    async cancelRegistration(topicId: string, studentId: string): Promise<{message: string}> {
        const registration = await this.studentRegTopicModel.findOne({
            topicId: topicId,
            studentId: studentId,
            deleted_at: null
        })
        if (!registration) {
            throw new RegistrationNotFoundException()
        }
        registration.deleted_at = new Date()

        const topic = await this.topicModel.findOne({ _id: registration.topicId, deleted_at: null }).exec()
        if (topic) {
            if (!(await this.checkFullSlot(topic.maxStudents, topicId))) {
                topic.status = TopicStatus.OPEN
            }
            await topic.save()
        } else {
            throw new TopicNotFoundException()
        }

        await registration.save()

        return { message: 'Đã xóa thành công đăng ký' }
    }

    async createSingleRegistration(topicId: string, studentId: string): Promise<any> {
        const topic = await this.topicModel.findOne({ _id: topicId, deleted_at: null }).exec()
        //topic not found or deleted
        if (!topic) {
            throw new TopicNotFoundException()
        }

        const existingRegistration = await this.studentRegTopicModel.findOne({
            topicId: new mongoose.Types.ObjectId(topicId),
            studentId: new mongoose.Types.ObjectId(studentId),
            deleted_at: null
        })

        if (existingRegistration) {
            throw new StudentAlreadyRegisteredException()
        }

        //check if topic is full registered
        const registeredCount = await this.studentRegTopicModel.countDocuments({
            topicId: topicId,
            deleted_at: null
        })

        if (registeredCount == topic.maxStudents) {
            throw new TopicIsFullRegisteredException()
        }

        const res = await this.studentRegTopicModel.create({
            topicId: topicId,
            studentId: studentId,
            status: RegistrationStatus.SUCCESS
        })
        if (registeredCount === topic.maxStudents - 1) {
            //update topic to full registered
            topic.status = TopicStatus.FULL
            await topic.save()
        }
        return res
    }
    async getRegisteredTopicsByUser(studentId: string): Promise<GetRegistrationDto[]> {
        const registrations = await this.studentRegTopicModel
            .find({
                studentId: new mongoose.Types.ObjectId(studentId),
                deleted_at: null
            })
            .lean()
        const newRegistrations = registrations.map((registration) => {
            return {
                ...registration,
                topic: registration.topicId
            }
        })
        return plainToInstance(GetRegistrationDto, newRegistrations, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
}
