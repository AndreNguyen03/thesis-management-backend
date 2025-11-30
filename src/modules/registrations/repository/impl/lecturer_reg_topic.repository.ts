import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import mongoose, { Model } from 'mongoose'
import { TopicNotFoundException } from '../../../../common/exceptions/thesis-exeptions'
import {
    FullLecturerSlotException,
    RegistrationNotFoundException,
    LecturerAlreadyRegisteredForThisThesisException
} from '../../../../common/exceptions/registration-exeptions'
import { GetRegistrationDto } from '../../../topics/dtos/registration/get-registration.dto'
import { plainToInstance } from 'class-transformer'
import { Topic } from '../../../topics/schemas/topic.schemas'
import { LecturerRegisterTopic } from '../../schemas/ref_lecturers_topics.schemas'
import { LecturerRegTopicRepositoryInterface } from '../lecturer-reg-topic.reposittory.interface'
import { RequestTimeoutException } from '@nestjs/common'
import { bool } from 'aws-sdk/clients/signer'
import { LecturerRoleEnum } from '../../enum/lecturer-role.enum'

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

    async createRegistrationWithLecturers(userId: string, lecturerIds: string[], topicId: string): Promise<boolean> {
        const topic = await this.topicModel.findOne({ _id: topicId, deleted_at: null }).exec()
        //topic not found or deleted
        if (!topic) {
            throw new TopicNotFoundException()
        }
        //tạo người hướng dẫn chính
        let res = await this.lecturerRegTopicModel.create({
            topicId: new mongoose.Types.ObjectId(topicId),
            userId: new mongoose.Types.ObjectId(userId),
            role: LecturerRoleEnum.MAIN_SUPERVISOR
        })

        //tạo người đồng hướng dẫn
        let res2 = await this.lecturerRegTopicModel.insertMany(
            lecturerIds.map((lecturerId) => ({
                topicId: new mongoose.Types.ObjectId(topicId),
                userId: new mongoose.Types.ObjectId(lecturerId),
                role: LecturerRoleEnum.CO_SUPERVISOR
            }))
        )

        // const names = populated.map((d) => (d.lecturerId as any)?.fullName).filter(Boolean) as string[]
        return res || res2.length > 0 ? true : false
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
            userId: lecturerId,
            deleted_at: null
        })

        if (existingRegistration) {
            throw new LecturerAlreadyRegisteredForThisThesisException()
        }
        try {
            const res = await this.lecturerRegTopicModel.create({
                topicId: new mongoose.Types.ObjectId(topicId),
                userId: new mongoose.Types.ObjectId(lecturerId),
                role: LecturerRoleEnum.CO_SUPERVISOR
            })
        } catch (error) {
            throw new RequestTimeoutException()
        }
    }
    async cancelRegistration(topicId: string, lecturerId: string){
        const registration = await this.lecturerRegTopicModel.findOne({
            topicId: new mongoose.Types.ObjectId(topicId),
            userId: new mongoose.Types.ObjectId(lecturerId),
            deleted_at: null
        })
        if (!registration) {
            throw new RegistrationNotFoundException()
        }

        registration.deleted_at = new Date()

        await registration.save()
    }
    async checkFullSlot(topicId: string): Promise<boolean> {
        const registrationCount = await this.lecturerRegTopicModel.countDocuments({
            topicId: topicId,
            deleted_at: null
        })
        if (registrationCount == 3) {
            return true
        }
        return false
    }
}
