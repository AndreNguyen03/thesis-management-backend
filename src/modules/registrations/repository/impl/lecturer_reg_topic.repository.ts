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
    FullLecturerSlotException,
    RegistrationNotFoundException,
    YouAlreadyRegisteredForThisThesisException
} from '../../../../common/exceptions/registration-exeptions'
import { GetRegistrationDto } from '../../../topics/dtos/registration/get-registration.dto'
import { plainToInstance } from 'class-transformer'
import { getUserModelFromRole } from '../../../topics/utils/get-user-model'
import { StudentRegTopicRepositoryInterface } from '../student-reg-topic.repository.interface'
import { Topic } from '../../../topics/schemas/topic.schemas'
import { GetTopicResponseDto } from '../../../topics/dtos'
import { LecturerRegisterTopic } from '../../schemas/ref_lecturers_topics.schemas'
import { LecturerRegTopicRepositoryInterface } from '../lecturer-reg-topic.reposittory.interface'

export class LecturerRegTopicRepository
    extends BaseRepositoryAbstract<LecturerRegisterTopic>
    implements LecturerRegTopicRepositoryInterface
{
    constructor(
        @InjectModel(LecturerRegisterTopic.name)
        private readonly lecturerRegTopicModel: Model<LecturerRegisterTopic>,
        @InjectModel(Topic.name)
        private readonly topicModel: Model<Topic>
    ) {
        super(lecturerRegTopicModel)
    }

    async createRegistrationWithLecturers(topicId: string, lecturerIds: string[]): Promise<string[]> {
        const topic = await this.topicModel.findOne({ _id: topicId, deleted_at: null }).exec()
        //topic not found or deleted
        if (!topic) {
            throw new TopicNotFoundException()
        }
        const createdLecturerRegs = await this.lecturerRegTopicModel.insertMany(
            lecturerIds.map((lecturerId) => ({
                topicId: new mongoose.Types.ObjectId(topicId),
                lecturerId: new mongoose.Types.ObjectId(lecturerId),
                status: RegistrationStatus.SUCCESS
            }))
        )
        const populated = await this.lecturerRegTopicModel.populate(createdLecturerRegs, {
            path: 'lecturerId',
            select: 'fullName'
        })
        console.log('populated lecturer regs:', populated)
        const names = populated.map((d) => (d.lecturerId as any)?.fullName).filter(Boolean) as string[]
        return names
    }
    async getCanceledRegistrationByUser(studentId: string): Promise<any> {
        const canceledRegistration = await this.lecturerRegTopicModel
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
    async createSingleRegistration(topicId: string, lecturerId: string): Promise<any> {
        const topic = await this.topicModel.findOne({ _id: topicId, deleted_at: null }).exec()
        //topic not found or deleted
        if (!topic) {
            throw new TopicNotFoundException()
        }

        const existingRegistration = await this.lecturerRegTopicModel.findOne({
            topicId: topicId,
            lecturerId: lecturerId,
            deleted_at: null
        })

        if (existingRegistration) {
            throw new YouAlreadyRegisteredForThisThesisException()
        }
        const topicRegistration = await this.lecturerRegTopicModel.countDocuments({
            lecturerId: lecturerId,
            topicId: topicId,
            deleted_at: null
        })

        if (topicRegistration == 2) {
            throw new FullLecturerSlotException()
        }

        const res = await this.lecturerRegTopicModel.create({
            topicId: new mongoose.Types.ObjectId(topicId),
            lecturerId: new mongoose.Types.ObjectId(lecturerId),
            status: RegistrationStatus.SUCCESS
        })
        const populated = await res.populate('topicId')
    }
    async getRegisteredTopicsByUser(lecturerId: string): Promise<GetRegistrationDto[]> {
        const registrations = await this.lecturerRegTopicModel
            .find({
                lecturer: new mongoose.Schema.Types.ObjectId(lecturerId)
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

    async cancelRegistration(topicId: string, lecturerId: string): Promise<string> {
        const registration = await this.lecturerRegTopicModel.findOne({
            topicId: topicId,
            lecturerId: lecturerId,
            deleted_at: null
        })
        if (!registration) {
            throw new RegistrationNotFoundException()
        }

        registration.deleted_at = new Date()

        await registration.save()

        return topicId
    }
}
