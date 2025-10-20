import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import mongoose, { Model } from 'mongoose'
import { UserRole } from '../../../../auth/enum/user-role.enum'
import { RegistrationStatus } from '../../../topics/enum'
import { Student } from '../../../../users/schemas/student.schema'
import { NotFoundException } from '@nestjs/common'
import {
    StudentAlreadyRegisteredException,
    TopicIsFullRegisteredException,
    TopicNotFoundException
} from '../../../../common/exceptions/thesis-exeptions'
import { RegistrationNotFoundException } from '../../../../common/exceptions/registration-exeptions'
import { GetRegistrationDto } from '../../../topics/dtos/registration/get-registration.dto'
import { plainToInstance } from 'class-transformer'
import { getUserModelFromRole } from '../../../topics/utils/get-user-model'
import { StudentRegTopicRepositoryInterface } from '../student-reg-topic.repository.interface'
import { StudentRegisterTopic } from '../../schemas/ref_students_topics.schemas'
import { Topic } from '../../../topics/schemas/topic.schemas'
import { GetTopicResponseDto } from '../../../topics/dtos'

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

    async createRegistration(topicId: string, studentId: string): Promise<any> {
        const topic = await this.topicModel.findOne({ _id: topicId, deleted_at: null }).exec()
        //topic not found or deleted
        if (!topic) {
            throw new TopicNotFoundException()
        }

        //check if topic is full registered
        if (topic.registeredStudents === topic.maxStudents) {
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

        if (topic.maxStudents === topic.registeredStudents) {
            throw new TopicIsFullRegisteredException()
        }
        await this.studentRegTopicModel.create({
            topicId: topicId,
            studentId: studentId,
            status: RegistrationStatus.SUCCESS
        })
        topic.registeredStudents += 1
        await topic.save()

        const res = plainToInstance(GetTopicResponseDto, topic, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
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
