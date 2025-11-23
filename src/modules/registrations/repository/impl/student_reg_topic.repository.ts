import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import mongoose, { Model } from 'mongoose'
import { TopicStatus } from '../../../topics/enum'
import {
    StudentAlreadyRegisteredException,
    StudentJustRegisterOnlyOneTopicEachType,
    TopicNotFoundException
} from '../../../../common/exceptions/thesis-exeptions'
import {
    RegistrationNotFoundException,
    TopicIsFullRegisteredException
} from '../../../../common/exceptions/registration-exeptions'
import { GetRegistrationDto } from '../../../topics/dtos/registration/get-registration.dto'
import { plainToInstance } from 'class-transformer'
import { StudentRegTopicRepositoryInterface } from '../student-reg-topic.repository.interface'
import { StudentRegisterTopic } from '../../schemas/ref_students_topics.schemas'
import { Topic } from '../../../topics/schemas/topic.schemas'
import { StudentRegistrationStatus } from '../../enum/student-registration-status.enum'
import { TopicTransfer, TopicType } from '../../../topics/enum/topic-type.enum'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { PaginationQueryDto } from '../../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'

export class StudentRegTopicRepository
    extends BaseRepositoryAbstract<StudentRegisterTopic>
    implements StudentRegTopicRepositoryInterface
{
    constructor(
        @InjectModel(StudentRegisterTopic.name)
        private readonly studentRegTopicModel: Model<StudentRegisterTopic>,
        @InjectModel(Topic.name)
        private readonly topicModel: Model<Topic>,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(studentRegTopicModel)
    }
    //hoạt động tốt nhưng rất tiếc chưa tối ưu cho các thao tác phân trang
    async getStudentRegistrationsHistory(
        studentId: string,
        query: PaginationQueryDto
    ): Promise<Paginated<StudentRegisterTopic>> {
        const pipelineSub = await this.BaseGetStudentRegistrationsHistory(studentId)
        return await this.paginationProvider.paginateQuery<StudentRegisterTopic>(
            query,
            this.studentRegTopicModel,
            pipelineSub
        )
    }
    async checkFullSlot(maxStudents: number, topicId: string): Promise<boolean> {
        const registeredCount = await this.studentRegTopicModel.countDocuments({
            topicId: topicId,
            deleted_at: null
        })
        return registeredCount === maxStudents
    }
    async createRegistrationWithStudents(topicId: string, studentIds: string[]): Promise<boolean> {
        const topic = await this.topicModel.findOne({ _id: topicId, deleted_at: null }).exec()
        //topic not found or deleted
        if (!topic) {
            throw new TopicNotFoundException()
        }
        const createdStudentRegs = await this.studentRegTopicModel.insertMany(
            studentIds.map((studentId) => ({
                topicId: new mongoose.Types.ObjectId(topicId),
                userId: new mongoose.Types.ObjectId(studentId),
                status: StudentRegistrationStatus.APPROVED
            }))
        )
        return createdStudentRegs.length > 0 ? true : false
    }

    async cancelRegistration(topicId: string, studentId: string): Promise<{ message: string }> {
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
                topic.currentStatus = TopicStatus.PendingRegistration
            }
            await topic.save()
        } else {
            throw new TopicNotFoundException()
        }

        await registration.save()

        return { message: 'Đã xóa thành công đăng ký' }
    }

    async createSingleRegistration(studentId: string, topicId: string): Promise<any> {
        const topic = await this.topicModel
            .findOne({ _id: new mongoose.Types.ObjectId(topicId), deleted_at: null })
            .exec()
        //topic not found or deleted
        if (!topic) {
            throw new TopicNotFoundException()
        }

        const existingRegistration = await this.studentRegTopicModel.findOne({
            topicId: new mongoose.Types.ObjectId(topicId),
            userId: new mongoose.Types.ObjectId(studentId),
            deleted_at: null
        })
        if (existingRegistration) {
            throw new StudentAlreadyRegisteredException()
        }
        // kiểm tra có đăng ký cùng type không nhưng mà trừ nghiên cứu khoa học ra
        let checkExistingRegisterOtherSameType = []
        if (topic.type !== TopicType.SCIENCE_RESEARCH) {
            checkExistingRegisterOtherSameType = await this.studentRegTopicModel.aggregate([
                {
                    $match: {
                        studentId: new mongoose.Types.ObjectId(studentId),
                        deleted_at: null
                    }
                },
                {
                    $lookup: {
                        from: 'topics',
                        localField: 'topicId',
                        foreignField: '_id',
                        as: 'topicInfo'
                    }
                },
                {
                    $unwind: '$topicInfo'
                },
                {
                    $match: {
                        'topicInfo.type': { $nin: [TopicType.SCIENCE_RESEARCH] }
                    }
                }
            ])
        }
        if (checkExistingRegisterOtherSameType.length > 0) {
            throw new StudentJustRegisterOnlyOneTopicEachType(TopicTransfer[topic.type])
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
            userId: studentId,
            status:
                topic.type === TopicType.SCIENCE_RESEARCH
                    ? StudentRegistrationStatus.PENDING
                    : StudentRegistrationStatus.APPROVED
        })
        if (registeredCount === topic.maxStudents - 1) {
            //update topic to full registered
            topic.currentStatus = TopicStatus.Full
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
    private async BaseGetStudentRegistrationsHistory(studentId: string) {
        let pipelineMain: any[] = []
        //basecase
        pipelineMain.push({
            $match: {
                userId: new mongoose.Types.ObjectId(studentId),
                deleted_at: null
            }
        })
        //lookup topic
        pipelineMain.push(
            ...[
                {
                    $lookup: {
                        from: 'topics',
                        localField: 'topicId',
                        foreignField: '_id',
                        as: 'topicInfo'
                    }
                },
                {
                    $unwind: '$topicInfo'
                }
            ]
        )
        // lookup major
        pipelineMain.push(
            ...[
                {
                    $lookup: {
                        from: 'majors',
                        localField: 'topicInfo.majorId',
                        foreignField: '_id',
                        as: 'majorInfo'
                    }
                },
                {
                    $unwind: '$majorInfo'
                }
            ]
        )
        // lookup period
        pipelineMain.push(
            ...[
                {
                    $lookup: {
                        from: 'periods',
                        localField: 'topicInfo.periodId',
                        foreignField: '_id',
                        as: 'periodInfo'
                    }
                },
                { $unwind: '$periodInfo' }
            ]
        )
        // lookup lecturer
        pipelineMain.push(
            ...[
                {
                    $lookup: {
                        from: 'ref_lecturers_topics',
                        localField: 'topicId',
                        foreignField: 'topicId',
                        as: 'refLecturer'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'refLecturer.userId',
                        foreignField: '_id',
                        as: 'lecturerInfo'
                    }
                },
                {
                    $lookup: {
                        from: 'lecturers',
                        localField: 'refLecturer.userId',
                        foreignField: 'userId',
                        as: 'lecturerDetails'
                    }
                }
            ]
        )

        // merge để có lectuer với titel
        pipelineMain.push({
            $addFields: {
                lecturers: {
                    $map: {
                        input: '$lecturerInfo',
                        as: 'userInfo',
                        in: {
                            $mergeObjects: [
                                '$$userInfo',
                                {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: '$lecturerDetails',
                                                    as: 'lecInfo',
                                                    cond: { $eq: ['$$lecInfo.userId', '$$userInfo._id'] }
                                                }
                                            },
                                            0
                                        ]
                                }
                            ]
                        }
                    }
                }
            }
        })
        //lọc ra
        pipelineMain.push({
            $project: {
                _id: 1,
                topicId: '$topicInfo._id',
                periodId: '$periodInfo._id',
                periodName: '$periodInfo.name',
                titleVN: '$topicInfo.titleVN',
                titleEng: '$topicInfo.titleEng',
                lecturers: 1,
                type: '$topicInfo.type',
                major: '$majorInfo.name',
                topicStatus: '$topicInfo.currentStatus',
                registrationStatus: '$status',
                registeredAt: '$createdAt'
            }
        })
        return pipelineMain
    }
}
