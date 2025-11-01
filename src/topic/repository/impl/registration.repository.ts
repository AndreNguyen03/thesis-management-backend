import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { Registration } from '../../schemas/registration.schema'
import { RegistrationRepositoryInterface } from '../registration.repository.interface'
import mongoose, { Model } from 'mongoose'
import { UserRole } from '../../../auth/enum/user-role.enum'
import { RegistrationStatus } from '../../enum'
import { Student } from '../../../users/schemas/student.schema'
import { NotFoundException } from '@nestjs/common'
import { Topic } from '../../schemas/topic.schemas'

import { RegistrationNotFoundException } from '../../../common/exceptions/registration-exeptions'
import { GetRegistrationDto } from '../../dtos/registration/get-registration.dto'
import { plainToClass, plainToInstance } from 'class-transformer'
import { GetTopicResponseDto } from '../../dtos'
import { getUserModelFromRole } from '../../utils/get-user-model'
import { StudentAlreadyRegisteredException, TopicIsFullRegisteredException, TopicNotFoundException } from '../../../common/exceptions'

export class RegistrationRepository
    extends BaseRepositoryAbstract<Registration>
    implements RegistrationRepositoryInterface
{
    constructor(
        @InjectModel(Registration.name)
        private readonly registrationModel: Model<Registration>,
        @InjectModel(Topic.name)
        private readonly TopicModel: Model<Topic>
    ) {
        super(registrationModel)
    }
    async getCanceledRegistrationByUser(userId: string, role: string): Promise<GetRegistrationDto[]> {
        const registrations = await this.registrationModel
            .find({
                registrantId: new mongoose.Types.ObjectId(userId),
                registrantModel: getUserModelFromRole(role),
                deleted_at: { $ne: null }
            })
            .populate({
                path: 'TopicId',
                select: 'title description department field maxStudents registeredStudents deadline requirements registrationIds status rating views createdAt updatedAt',
                populate: {
                    path: 'registrationIds',
                    select: 'registrantId registrantModel',
                    populate: {
                        path: 'registrantId',
                        select: 'fullName role'
                    }
                }
            })
            .lean()
        const mappedRegistrations = registrations.map((registration) => {
            const { topicId, registrantModel, registrantId, ...rest } = registration
            return {
                ...rest,
                topic: topicId
            }
        })
        return plainToInstance(GetRegistrationDto, mappedRegistrations, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    async createRegistration(topicId: string, userId: string, role: string): Promise<GetTopicResponseDto> {
        const topic = await this.TopicModel.findOne({ _id: topicId, deleted_at: null }).exec()
        //Topic not found or deleted
        if (!topic) {
            throw new TopicNotFoundException()
        }

        //check if Topic is full registered
        if (topic.registeredStudents === topic.maxStudents) {
            throw new TopicIsFullRegisteredException()
        }

        const existingRegistration = await this.registrationModel.findOne({
            topicId: topicId,
            registrantId: userId,
            deleted_at: null
        })
        if (existingRegistration) {
            throw new StudentAlreadyRegisteredException()
        }
        if (topic.maxStudents === topic.registeredStudents) {
            throw new TopicIsFullRegisteredException()
        }
        const newRegistration = await this.registrationModel.create({
            topicId: topicId,
            registrantId: userId,
            registrantModel: role == UserRole.STUDENT ? 'Student' : 'Lecturer',
            status: RegistrationStatus.APPROVED
        })
        topic.registeredStudents += 1
        topic.registrationIds?.push(newRegistration._id)
        await topic.save()

        await topic.populate({
            path: 'registrationIds',
            select: 'registrantId registrantModel status',
            populate: { path: 'registrantId', select: '_id fullName role' }
        })
        const res = plainToInstance(GetTopicResponseDto, Topic, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
        return res
    }
    async getTopicRegistrationsByUser(userId: string, role: string): Promise<GetRegistrationDto[]> {
        const registrations = await this.registrationModel
            .find({
                registrantId: new mongoose.Types.ObjectId(userId),
                registrantModel: role == UserRole.STUDENT ? 'Student' : 'Lecturer',
                deleted_at: null
            })
            .populate({
                path: 'TopicId',
                select: 'title description department field maxStudents registeredStudents deadline requirements registrationIds status rating views createdAt updatedAt',
                populate: {
                    path: 'registrationIds',
                    select: 'registrantId registrantModel',
                    populate: {
                        path: 'registrantId',
                        select: 'fullName role'
                    }
                }
            })
            .lean()

        const mappedRegistrations = registrations.map((registration) => {
            const { topicId, registrantModel, registrantId, ...rest } = registration
            return {
                ...rest,
                topic: topicId
            }
        })
        return plainToInstance(GetRegistrationDto, mappedRegistrations, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    async deleteRegistration(TopicId: string, userId: string, role: string): Promise<Registration> {
        const registration = await this.registrationModel
            .findOne({
                TopicId: new mongoose.Types.ObjectId(TopicId),
                registrantId: userId,
                registrantModel: role === UserRole.STUDENT ? 'Student' : 'Lecturer',
                registrationStatus: RegistrationStatus.CANCELED,
                deleted_at: null
            })
            .exec()

        if (!registration) {
            throw new RegistrationNotFoundException()
        }
        registration.deleted_at = new Date()
        const Topic = await this.TopicModel.findOne({ _id: registration.topicId, deleted_at: null }).exec()
        if (Topic) {
            Topic.updateOne({ $pull: { registrationIds: registration._id }, $inc: { registeredStudents: -1 } }).exec()

            await Topic.save()
        } else {
            throw new TopicNotFoundException()
        }

        await registration.save()
        Topic.populate({
            path: 'registrationIds',
            select: 'registrantId registrantModel status',
            populate: { path: 'registrantId', select: '_id fullName role' }
        })

        return registration
    }
}
