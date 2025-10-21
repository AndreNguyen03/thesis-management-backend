import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import mongoose, { Model } from 'mongoose'
import { UserRole } from '../../../../auth/enum/user-role.enum'
import { RegistrationStatus } from '../../../topics/enum'
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
        return populated.map((d)=>(d.studentId as any)?.name).filter(Boolean) as string[]
    }

    async cancelRegistration(topicId: string, studentId: string): Promise<string> {
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
            topic.updateOne({ $inc: { registeredStudents: -1 } }).exec()
            await topic.save()
        } else {
            throw new TopicNotFoundException()
        }

        await registration.save()

        return topicId
    }
    async getCanceledRegistrationByUser(studentId: string): Promise<any> {
        const canceledRegistration = await this.studentRegTopicModel
            .find({
                studentId: new mongoose.Schema.Types.ObjectId(studentId),
                deleted_at: { $ne: null }
            })
            .populate('topicId')
            .lean()
        const newRegistrations = canceledRegistration.map((registration) => {
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

    async createSingleRegistration(topicId: string, studentId: string): Promise<any> {
        const topic = await this.topicModel.findOne({ _id: topicId, deleted_at: null }).exec()
        //topic not found or deleted
        if (!topic) {
            throw new TopicNotFoundException()
        }

        const studentRegTopicCount = await this.studentRegTopicModel.countDocuments({
            topicId: topicId,
            deleted_at: null
        })
        //check if topic is full registered
        if (studentRegTopicCount === topic.maxStudents) {
            throw new TopicIsFullRegisteredException()
        }

        const existingRegistration = await this.studentRegTopicModel.findOne({
            topicId: topicId,
            studentId: studentId,
            deleted_at: null
        })

        if (existingRegistration) {
            throw new StudentAlreadyRegisteredException()
        }

        const res = await this.studentRegTopicModel.create({
            topicId: topicId,
            studentId: studentId,
            status: RegistrationStatus.SUCCESS
        })

        return res
    }
    async getRegisteredTopicsByUser(studentId: string): Promise<GetRegistrationDto[]> {
        const registrations = await this.studentRegTopicModel
            .find({
                studentId: new mongoose.Schema.Types.ObjectId(studentId)
            })
            .populate('topicId')
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
