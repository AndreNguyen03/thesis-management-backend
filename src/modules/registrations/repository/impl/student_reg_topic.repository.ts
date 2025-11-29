import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import mongoose, { Model } from 'mongoose'
import { RegistrationStatus, TopicStatus } from '../../../topics/enum'
import {
    StudentAlreadyRegisteredException,
    StudentJustRegisterOnlyOneTopicEachType,
    TopicNotFoundException
} from '../../../../common/exceptions/thesis-exeptions'
import {
    FullLecturerSlotException,
    RegistrationNotFoundException,
    StudentRegistrationNotFoundException,
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
import { GetStudentsRegistrationsInTopic } from '../../../topics/dtos/registration/get-students-in-topic'
import { RequestTimeoutException } from '@nestjs/common'

export class StudentRegTopicRepository
    extends BaseRepositoryAbstract<StudentRegisterTopic>
    implements StudentRegTopicRepositoryInterface
{
    constructor(
        @InjectModel(StudentRegisterTopic.name)
        private readonly studentRegTopicModel: Model<StudentRegisterTopic>,
        @InjectModel(Topic.name)
        private readonly topicModel: Model<Topic>,
        private readonly paginationProvider: PaginationProvider,
        private readonly connection: mongoose.Connection
    ) {
        super(studentRegTopicModel)
    }

    private buildStudentPipeline(topicId: string, status: StudentRegistrationStatus) {
        return [
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'stuUserInfo'
                }
            },
            {
                $lookup: {
                    from: 'students',
                    localField: 'userId',
                    foreignField: 'userId',
                    as: 'studentInfos'
                }
            },
            {
                $addFields: {
                    student: {
                        $arrayElemAt: [
                            {
                                $map: {
                                    input: '$stuUserInfo',
                                    as: 'userInfo',
                                    in: {
                                        $mergeObjects: [
                                            {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: '$studentInfos',
                                                            as: 'stuInfo',
                                                            cond: { $eq: ['$$stuInfo.userId', '$$userInfo._id'] }
                                                        }
                                                    },
                                                    0
                                                ]
                                            },
                                            '$$userInfo'
                                        ]
                                    }
                                }
                            },
                            0
                        ]
                    }
                }
            },
            {
                $project: {
                    student: 1,
                    createdAt: 1,
                    topicId: 1,
                    status: 1,
                    deleted_at: 1
                }
            },
            {
                $match: {
                    topicId: new mongoose.Types.ObjectId(topicId),
                    status: status,
                    deleted_at: null
                }
            }
        ]
    }

    async getApprovedAndPendingStudentRegistrationsInTopic(
        topicId: string
    ): Promise<GetStudentsRegistrationsInTopic | null> {
        const res = await this.studentRegTopicModel.aggregate([
            {
                $facet: {
                    approvedStudents: this.buildStudentPipeline(topicId, StudentRegistrationStatus.APPROVED),
                    pendingStudents: this.buildStudentPipeline(topicId, StudentRegistrationStatus.PENDING)
                }
            }
        ])
        return {
            topicId,
            approvedStudents: res[0].approvedStudents || [],
            pendingStudents: res[0].pendingStudents || []
        }
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
    async checkSlot(checkValue: number, topicId: string): Promise<boolean> {
        const registeredCount = await this.studentRegTopicModel.countDocuments({
            topicId: new mongoose.Types.ObjectId(topicId),
            deleted_at: null
        })
        return registeredCount === checkValue
    }
    async createRegistrationWithStudents(topicId: string, studentIds: string[]): Promise<boolean> {
        const topic = await this.topicModel
            .findOne({ _id: new mongoose.Types.ObjectId(topicId), deleted_at: null })
            .exec()
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
            topicId: new mongoose.Types.ObjectId(topicId),
            userId: new mongoose.Types.ObjectId(studentId),
            deleted_at: null
        })
        if (!registration) {
            throw new RegistrationNotFoundException()
        }
        registration.deleted_at = new Date()

        // Tính trạng thái mới cho topic
        let newStatus: TopicStatus | undefined
        const isFull = await this.topicModel.exists({
            _id: registration.topicId,
            currentStatus: TopicStatus.Full,
            deleted_at: null
        })
        if (isFull) {
            newStatus = TopicStatus.Registered
        } else if (await this.checkSlot(1, topicId)) {
            newStatus = TopicStatus.PendingRegistration
        }

        // Cập nhật trạng thái topic nếu cần
        if (newStatus) {
            await this.topicModel.findOneAndUpdate(
                { _id: registration.topicId, deleted_at: null },
                { currentStatus: newStatus }
            )
        }

        await registration.save()
        return { message: 'Đã xóa thành công đăng ký' }
    }

    async createSingleRegistration(studentId: string, topicId: string, allowManualApproval: boolean): Promise<any> {
        const topic = await this.topicModel
            .findOne({ _id: new mongoose.Types.ObjectId(topicId), deleted_at: null })
            .exec()
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

        if (topic.currentStatus === TopicStatus.Full) {
            throw new TopicIsFullRegisteredException()
        }
        const newStatus =
            topic.type === TopicType.SCIENCE_RESEARCH || allowManualApproval
                ? StudentRegistrationStatus.PENDING
                : StudentRegistrationStatus.APPROVED
        try {
            await this.studentRegTopicModel.create({
                topicId: new mongoose.Types.ObjectId(topicId),
                userId: new mongoose.Types.ObjectId(studentId),
                status: newStatus
            })
        } catch (error) {
            console.log('Error during registration creation:', error)
            throw new RequestTimeoutException()
        }

        //update topic to full registered
        const res = await this.topicModel.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(topicId), deleted_at: null },
            {
                currentStatus: (await this.checkSlot(topic.maxStudents - 1, topicId))
                    ? TopicStatus.Full
                    : TopicStatus.Registered
            }
        )

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
    async approvalStudentRegistrationByLecturer(
        userId: string,
        registrationId: string,
        role: string,
        lecturerResponse: string
    ) {
        const session = await this.connection.startSession()
        session.startTransaction()
        try {
            const registration = await this.studentRegTopicModel.findById(registrationId).session(session)
            if (!registration) {
                throw new StudentRegistrationNotFoundException()
            }
            const topic = await this.topicModel.findById(registration.topicId).session(session)
            if (!topic) {
                throw new TopicNotFoundException()
            }
            const currentApprovedCount = await this.studentRegTopicModel
                .countDocuments({
                    topicId: topic._id,
                    status: RegistrationStatus.APPROVED,
                    deleted_at: null
                })
                .session(session)

            if (currentApprovedCount >= topic.maxStudents) {
                throw new FullLecturerSlotException()
            }

            registration.status = StudentRegistrationStatus.APPROVED
            registration.processedBy = userId
            registration.lecturerResponse = lecturerResponse
            registration.studentRole = role
            //cập nhật trạng thái đề tài sau khi đã duyệt đăng ký 1 sinh viên
            //chuyển trạng thái từ open_pending(chua có ai đăng ký) sang registered
            if (topic.currentStatus === TopicStatus.PendingRegistration) {
                topic.currentStatus = TopicStatus.Registered
            } else if (currentApprovedCount + 1 === topic.maxStudents) {
                //chuyển trạng thái từ đã có người đăng ký sang full
                topic.currentStatus = TopicStatus.Full
            }

            await topic.save({ session })
            await registration.save({ session })
            await session.commitTransaction()
            return registration
        } catch (error) {
            await session.abortTransaction()
            throw error
        } finally {
            session.endSession()
        }
    }
    async rejectStudentRegistrationByLecturer(registrationId: string, reasonType: string, lecturerResponse: string) {
        const session = await this.connection.startSession()
        session.startTransaction()
        try {
            const registration = await this.studentRegTopicModel.findById(registrationId).session(session)
            if (!registration) {
                throw new StudentRegistrationNotFoundException()
            }
            const topic = await this.topicModel.findById(registration.topicId).session(session)
            if (!topic) {
                throw new TopicNotFoundException()
            }
            //cập nhật trạng thái từ chối
            registration.status = StudentRegistrationStatus.REJECTED
            registration.rejectionReasonType = reasonType
            registration.lecturerResponse = lecturerResponse

            await registration.save({ session })
            await session.commitTransaction()
            return registration
        } catch (error) {
            await session.abortTransaction()
            throw error
        } finally {
            session.endSession()
        }
    }
}
