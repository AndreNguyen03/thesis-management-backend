import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import mongoose, { Model } from 'mongoose'
import { RegistrationStatus } from '../../../topics/enum'
import { TopicNotFoundException } from '../../../../common/exceptions/thesis-exeptions'
import {
    FullLecturerSlotException,
    RegistrationNotFoundException,
    YouAlreadyRegisteredForThisThesisException
} from '../../../../common/exceptions/registration-exeptions'
import { GetRegistrationDto } from '../../../topics/dtos/registration/get-registration.dto'
import { plainToInstance } from 'class-transformer'
import { Topic } from '../../../topics/schemas/topic.schemas'
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

        const names = populated.map((d) => (d.lecturerId as any)?.fullName).filter(Boolean) as string[]
        return names
    }

    async createSingleRegistration(topicId: string, lecturerId: string): Promise<any> {
        const topic = await this.topicModel.findOne({ _id: topicId, deleted_at: null }).exec()
        //topic not found or deleted
        if (!topic) {
            throw new TopicNotFoundException()
        }
        const isFull = await this.checkFullSlot(topicId)
        if (isFull) {
            throw new FullLecturerSlotException()
        }
        const existingRegistration = await this.lecturerRegTopicModel.findOne({
            topicId: topicId,
            lecturerId: lecturerId,
            deleted_at: null
        })

        if (existingRegistration) {
            throw new YouAlreadyRegisteredForThisThesisException()
        }

        const res = await this.lecturerRegTopicModel.create({
            topicId: new mongoose.Types.ObjectId(topicId),
            lecturerId: new mongoose.Types.ObjectId(lecturerId),
            status: RegistrationStatus.SUCCESS
        })
        const populated = await res.populate('topicId')
    }
    async cancelRegistration(topicId: string, lecturerId: string): Promise<{message: string}> {
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

        return { message: 'Đã xóa thành công đăng ký' }
    }
    async checkFullSlot(topicId: string): Promise<boolean> {
        const registrationCount = await this.lecturerRegTopicModel.countDocuments({
            topicId: topicId,
            deleted_at: null
        })
        if (registrationCount == 2) {
            return true
        }
        return false
    }
}
