import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import mongoose, { Model, mongo } from 'mongoose'
import { TopicStatus } from '../../../topics/enum'
import {
    StudentAlreadyRegisteredException,
    StudentJustRegisterOnlyOneTopicEachType,
    StudentRejectedException,
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
import { UserRole } from '../../../../users/enums/user-role'
import { ActiveUserData } from '../../../../auth/interface/active-user-data.interface'
import { TranferStatusAndAddPhaseHistoryProvider } from '../../../topics/providers/tranfer-status-and-add-phase-history.provider'
import { PaginationStudentGetHistoryQuery } from '../../dtos/request.dto'
import { MetaCustom } from '../../dtos/get-history-registration.dto'

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
        private readonly connection: mongoose.Connection,
        private readonly tranferStatusAndAddPhaseHistoryProvider: TranferStatusAndAddPhaseHistoryProvider
    ) {
        super(studentRegTopicModel)
    }
    async getStudentTopicStateInPeriod(studentId: string) {
        const studentObjId = new mongoose.Types.ObjectId(studentId)

        const pipeline: any[] = [
            {
                $match: {
                    userId: studentObjId,
                    status: StudentRegistrationStatus.APPROVED
                }
            },
            {
                $lookup: {
                    from: 'topics',
                    localField: 'topicId',
                    foreignField: '_id',
                    as: 'topic'
                }
            },
            {
                $unwind: {
                    path: '$topic',
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $lookup: {
                    from: 'periods',
                    let: {
                        periodId: '$topic.periodId'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: [{ $year: '$endTime' }, { $year: '$$NOW' }]
                                        },
                                        {
                                            $eq: ['$_id', '$$periodId']
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'period'
                }
            },
            // {
            //     $unwind: {
            //         path: 'period'
            //     }
            // },
            {
                $project: {
                    // Project các trường cần từ StudentRegisterTopic và Topic
                    _id: 1,
                    userId: 1,
                    topicId: 1,
                    status: 1,
                    // Từ topic
                    'topic.titleVN': 1,
                    'topic.titleEng': 1,
                    'topic.description': 1,
                    'topic.type': 1,
                    'topic.majorId': 1,
                    'topic.currentStatus': 1,
                    'topic.currentPhase': 1,
                    'topic.periodId': 1,
                    'topic.defenseResult': 1
                    // Thêm các trường khác nếu cần, ví dụ: 'topic.fileIds': 1
                }
            },
            { $sort: { created_at: -1 } }
        ]

        return this.studentRegTopicModel.aggregate(pipeline).exec()
    }
    async getParticipantsInTopic(topicId: string): Promise<string[]> {
        const registrations = await this.studentRegTopicModel
            .find({
                topicId: new mongoose.Types.ObjectId(topicId),
                deleted_at: null,
                status: StudentRegistrationStatus.APPROVED
            })
            .lean()
        return registrations.map((reg) => reg.userId.toString())
    }
    //Lấy những đề tài mà sinh viên tham gia tức trạng thía đăng ký là approval
    async getTopicIdsByStudentId(studentId: string): Promise<string[]> {
        const topic = await this.studentRegTopicModel.find(
            {
                userId: new mongoose.Types.ObjectId(studentId),
                status: StudentRegistrationStatus.APPROVED,
                deleted_at: null
            },
            {
                topicId: 1,
                _id: 0
            }
        )
        return topic ? topic.map((id) => id.toString()) : []
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
        query: PaginationStudentGetHistoryQuery
    ): Promise<{ data: Paginated<StudentRegisterTopic>; meta: MetaCustom }> {
        const pipeline: any[] = this.BaseGetStudentRegistrationsHistory(studentId)
        if (query.periodId) {
            pipeline.push({
                $match: {
                    periodId: new mongoose.Types.ObjectId(query.periodId)
                }
            })
        }
        const data = await this.paginationProvider.paginateQuery<StudentRegisterTopic>(
            query,
            this.studentRegTopicModel,
            pipeline
        )
        pipeline.push({ $group: { _id: null, periodOptions: { $addToSet: '$periodInfo' } } })
        const metaAggregation = await this.studentRegTopicModel.aggregate(pipeline).exec()
        return {
            data,
            meta: metaAggregation[0] || {}
        }
    }
    async checkSlot(checkValue: number, topicId: string): Promise<boolean> {
        const registeredCount = await this.studentRegTopicModel.countDocuments({
            topicId: new mongoose.Types.ObjectId(topicId),
            status: StudentRegistrationStatus.APPROVED,
            deleted_at: null
        })
        return registeredCount === checkValue
    }
    //Sử dụng trong việc tạo đề tài
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
    //sinh viên hủy đăng ký
    async cancelRegistration(topicId: string, studentId: string): Promise<{ message: string }> {
        console.log('================ CANCEL REGISTRATION ================')
        console.log('Input:')
        console.log(' - topicId  :', topicId)
        console.log(' - studentId:', studentId)

        // 1️⃣ Find topic
        const topic = await this.topicModel
            .findOne({
                _id: new mongoose.Types.ObjectId(topicId),
                deleted_at: null
            })
            .exec()

        console.log('Found topic:', topic ? topic._id : null)

        if (!topic) {
            console.error('❌ Topic not found')
            throw new TopicNotFoundException()
        }

        console.log('Topic currentStatus:', topic.currentStatus)

        // 2️⃣ Find registration
        const registration = await this.studentRegTopicModel.findOne({
            topicId: new mongoose.Types.ObjectId(topicId),
            userId: new mongoose.Types.ObjectId(studentId),
            status: { $in: [StudentRegistrationStatus.PENDING] },
            deleted_at: null
        })

        console.log('Found registration:', registration ? registration._id : null)

        if (!registration) {
            console.error('❌ Registration not found or not in PENDING status')
            throw new RegistrationNotFoundException()
        }

        console.log('Registration status BEFORE:', registration.status)

        // 3️⃣ Update registration
        registration.status = StudentRegistrationStatus.WITHDRAWN
        registration.processedBy = studentId

        console.log('Registration status AFTER:', registration.status)

        // 4️⃣ Calculate new topic status
        let newStatus: TopicStatus | undefined

        if (topic.currentStatus === TopicStatus.Full) {
            newStatus = TopicStatus.Registered
            console.log('Topic was FULL → set to REGISTERED')
        } else {
            const hasSlot = await this.checkSlot(1, topicId)
            console.log('Check slot result:', hasSlot)

            if (hasSlot) {
                newStatus = TopicStatus.PendingRegistration
                console.log('Has slot → set to PENDING_REGISTRATION')
            }
        }

        // 5️⃣ Update topic if needed
        if (newStatus) {
            console.log('Updating topic status to:', newStatus)

            await this.topicModel.findOneAndUpdate(
                { _id: registration.topicId, deleted_at: null },
                { currentStatus: newStatus }
            )
        } else {
            console.log('No topic status update needed')
        }

        // 6️⃣ Save registration
        await registration.save()
        console.log('Registration saved successfully')

        console.log('================ END CANCEL REGISTRATION ================')

        return { message: 'Đã xóa thành công đăng ký' }
    }

    //giảng viên hd chính bỏ sinh viên ra khỏi đề tài
    async unassignStudentInTopic(
        user: ActiveUserData,
        topicId: string,
        studentId: string
    ): Promise<{ message: string }> {
        const { role, sub: lecturerId } = user
        //  console.log('Cancel registration called for student:', studentId, 'and topic:', topicId)
        const topic = await this.topicModel
            .findOne({ _id: new mongoose.Types.ObjectId(topicId), deleted_at: null })
            .exec()
        if (!topic) {
            throw new TopicNotFoundException()
        }
        const registration = await this.studentRegTopicModel.findOne({
            topicId: new mongoose.Types.ObjectId(topicId),
            userId: new mongoose.Types.ObjectId(studentId),
            status: { $in: [StudentRegistrationStatus.PENDING, StudentRegistrationStatus.APPROVED] },
            deleted_at: null
        })
        if (!registration) {
            throw new RegistrationNotFoundException()
        }
        registration.status = StudentRegistrationStatus.CANCELLED
        registration.processedBy = lecturerId
        // Tính trạng thái mới cho topic
        let newStatus: TopicStatus | undefined

        if (topic.currentStatus === TopicStatus.Full) {
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

    async createSingleRegistration(actionRole: string, studentId: string, topicId: string): Promise<any> {
        //console.log('Create single registration called for student:', studentId, 'and topic:', topicId)
        const topic = await this.topicModel
            .findOne({ _id: new mongoose.Types.ObjectId(topicId), deleted_at: null })
            .exec()
        if (!topic) {
            throw new TopicNotFoundException()
        }
        if (actionRole === 'student') {
            //Nếu là sinh viên đăng ký thì kiểm tra sinh viên có bị từ chối trước đó hay không
            const existingRejectedRegistration = await this.studentRegTopicModel.findOne({
                topicId: new mongoose.Types.ObjectId(topicId),
                userId: new mongoose.Types.ObjectId(studentId),
                status: StudentRegistrationStatus.REJECTED,
                deleted_at: null
            })
            if (existingRejectedRegistration) {
                throw new StudentRejectedException()
            }
        }
        //Với tất cả các role
        //Kiểm tra đăng ký đã tồn tại trước đó hay chưa
        const existingRegistration = await this.studentRegTopicModel.findOne({
            topicId: new mongoose.Types.ObjectId(topicId),
            userId: new mongoose.Types.ObjectId(studentId),
            status: { $in: [StudentRegistrationStatus.PENDING, StudentRegistrationStatus.APPROVED] },
            deleted_at: null
        })
        if (existingRegistration) {
            throw new StudentAlreadyRegisteredException()
        }
        // kiểm tra có đăng ký đề tài khóa luận khác không
        //riêng nghiên cứu khoa học thì không kiểm tra vì sinh viên có thể đăng ký được nhiều đề tài nghiên cứu khoa học

        if (topic.type !== TopicType.SCIENCE_RESEARCH) {
            let checkExistingRegisterOtherSameType = await this.studentRegTopicModel.aggregate([
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
                        $expr: {
                            $and: [
                                { $not: { $in: ['$topicInfo.type', [TopicType.SCIENCE_RESEARCH]] } },
                                { $eq: ['$userId', new mongoose.Types.ObjectId(studentId)] },
                                { $eq: ['$status', StudentRegistrationStatus.APPROVED] },
                                { $eq: ['$deleted_at', null] }
                            ]
                        }
                    }
                }
            ])
            if (checkExistingRegisterOtherSameType.length > 0) {
                throw new StudentJustRegisterOnlyOneTopicEachType(TopicTransfer[topic.type])
            }
        }

        //check if topic is full registered
        if (topic.currentStatus === TopicStatus.Full) {
            throw new TopicIsFullRegisteredException()
        }
        //nếu là giáng vin assign cho sinh viên thì không cần xét duyệt (xét status là approved luôn)
        const newStatus =
            actionRole !== UserRole.LECTURER && (topic.type === TopicType.SCIENCE_RESEARCH || topic.allowManualApproval)
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

        const res = await this.topicModel.findOne({
            _id: new mongoose.Types.ObjectId(topicId),
            deleted_at: null
        })

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
    private BaseGetStudentRegistrationsHistory(studentId: string) {
        let pipelineMain: any[] = []
        //basecase
        pipelineMain.push({
            $match: {
                userId: new mongoose.Types.ObjectId(studentId)
            }
        })
        //lookup topic
        pipelineMain.push(
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
        )
        // lookup major
        pipelineMain.push(
            {
                $lookup: {
                    from: 'majors',
                    localField: 'topicInfo.majorId',
                    foreignField: '_id',
                    as: 'majorInfo'
                }
            },
            {
                $unwind: {
                    path: '$majorInfo',
                    preserveNullAndEmptyArrays: true
                }
            }
        )

        // lookup period
        pipelineMain.push(
            {
                $lookup: {
                    from: 'periods',
                    localField: 'topicInfo.periodId',
                    foreignField: '_id',
                    as: 'periodInfo'
                }
            },
            {
                $unwind: {
                    path: '$periodInfo',
                    preserveNullAndEmptyArrays: true
                }
            }
        )
        // lookup period
        pipelineMain.push(
            {
                $lookup: {
                    from: 'faculties',
                    localField: 'periodInfo.faculty',
                    foreignField: '_id',
                    as: 'facultyInfo'
                }
            },
            { $unwind: { path: '$facultyInfo', preserveNullAndEmptyArrays: true } }
        )

        pipelineMain.push({
            $addFields: {
                periodInfo: {
                    $mergeObjects: ['$periodInfo', { faculty: '$facultyInfo' }]
                }
            }
        })
        // lookup lecturer
        pipelineMain.push(
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
        //lấy ra giảng viên đã thực hiện việc từ chối đăng ký
        pipelineMain.push(
            {
                $lookup: {
                    from: 'users',
                    localField: 'processedBy',
                    foreignField: '_id',
                    as: 'processorInfo'
                }
            },
            {
                $addFields: {
                    processedBy: {
                        $arrayElemAt: ['$processorInfo', 0]
                    }
                }
            }
        )
        //lọc ra
        pipelineMain.push({
            $project: {
                _id: 1,
                topicId: '$topicInfo._id',
                periodId: '$periodInfo._id',
                topicInfo: '$topicInfo',
                periodInfo: 1,
                titleVN: '$topicInfo.titleVN',
                titleEng: '$topicInfo.titleEng',
                lecturers: 1,
                type: '$topicInfo.type',
                major: '$majorInfo.name',
                topicStatus: '$topicInfo.currentStatus',
                registrationStatus: '$status',
                registeredAt: '$createdAt',
                lecturerResponse: 1,
                rejectionReasonType: 1,
                processedBy: 1
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
            const registration = await this.studentRegTopicModel
                .findOne({ _id: new mongoose.Types.ObjectId(registrationId), deleted_at: null })
                .session(session)
            if (!registration) {
                throw new StudentRegistrationNotFoundException()
            }
            const topic = await this.topicModel
                .findOne({ _id: new mongoose.Types.ObjectId(registration.topicId), deleted_at: null })
                .session(session)
            if (!topic) {
                throw new TopicNotFoundException()
            }
            const currentApprovedCount = await this.studentRegTopicModel
                .countDocuments({
                    topicId: topic._id,
                    status: StudentRegistrationStatus.APPROVED,
                    deleted_at: null
                })
                .session(session)

            if (currentApprovedCount >= topic.maxStudents) {
                throw new FullLecturerSlotException()
            }
            //Kiểm tra sinh viên    đã đăng ký đề tài cùng loại
            if (topic.type !== TopicType.SCIENCE_RESEARCH) {
                let checkExistingRegisterOtherSameType = await this.studentRegTopicModel.aggregate([
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
                            $expr: {
                                $and: [
                                    { $not: { $in: ['$topicInfo.type', [TopicType.SCIENCE_RESEARCH]] } },
                                    { $eq: ['$userId', registration.userId] },
                                    { $eq: ['$status', StudentRegistrationStatus.APPROVED] },
                                    { $eq: ['$deleted_at', null] }
                                ]
                            }
                        }
                    }
                ])
                if (checkExistingRegisterOtherSameType.length > 0) {
                    throw new StudentJustRegisterOnlyOneTopicEachType(TopicTransfer[topic.type])
                }
            }

            registration.status = StudentRegistrationStatus.APPROVED
            registration.processedBy = userId
            registration.lecturerResponse = lecturerResponse
            registration.studentRole = role

            await topic.save({ session })
            await registration.save({ session })
            await session.commitTransaction()
            //cập nhật trạng thái đề tài sau khi đã duyệt đăng ký 1 sinh viên
            //chuyển trạng thái từ open_pending(chua có ai đăng ký) sang registered
            if (currentApprovedCount + 1 === topic.maxStudents) {
                //chuyển trạng thái từ đã có người đăng ký sang full
                topic.currentStatus = TopicStatus.Full
                await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
                    topic._id.toString(),
                    TopicStatus.Full,
                    'Hệ thống tự động chuyển trạng thái đề tài sang Đã đủ người đăng ký',
                    'Giảng viên duyệt tham gia slot cuối cùng'
                )
            } else if (topic.currentStatus === TopicStatus.PendingRegistration) {
                topic.currentStatus = TopicStatus.Registered
                await this.tranferStatusAndAddPhaseHistoryProvider.transferStatusAndAddPhaseHistory(
                    topic._id.toString(),
                    TopicStatus.Registered,
                    'Hệ thống tự động chuyển trạng thái đề tài sang Đã có người đăng ký',
                    'Giảng viên duyệt tham gia slot đầu tiên'
                )
            }
            return registration
        } catch (error) {
            await session.abortTransaction()
            throw error
        } finally {
            session.endSession()
        }
    }
    async rejectStudentRegistrationByLecturer(
        userId: string,
        registrationId: string,
        reasonType: string,
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
            //cập nhật trạng thái từ chối
            registration.status = StudentRegistrationStatus.REJECTED
            registration.rejectionReasonType = reasonType
            registration.lecturerResponse = lecturerResponse
            registration.processedBy = userId

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
    async deleteForceStudentRegistrationsInTopics(topicId: string[]): Promise<void> {
        await this.studentRegTopicModel.deleteMany({
            topicId: { $in: topicId.map((id) => new mongoose.Types.ObjectId(id)) },
            deleted_at: null
        })
    }
}
