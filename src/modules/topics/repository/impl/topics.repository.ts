import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { plainToInstance } from 'class-transformer'
import { Topic } from '../../schemas/topic.schemas'
import {
    CreateTopicDto,
    GetTopicDetailResponseDto,
    GetTopicResponseDto,
    RequestGetTopicsInPeriodDto,
    RequestGetTopicsInPhaseDto
} from '../../dtos'
import { TopicRepositoryInterface } from '../topic.repository.interface'
import mongoose, { Model } from 'mongoose'
import { UserRole } from '../../../../auth/enum/user-role.enum'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'
import { BadRequestException, RequestTimeoutException } from '@nestjs/common'
import { RequestGradeTopicDto } from '../../dtos/request-grade-topic.dtos'
import {
    GetTopicsStatisticInCompletionPhaseDto,
    GetTopicsStatisticInExecutionPhaseDto,
    GetTopicStatisticInOpenRegPhaseDto,
    GetTopicStatisticInSubmitPhaseDto,
    LecGetTopicsStatisticInCompletionPhaseDto,
    LecGetTopicsStatisticInExecutionPhaseDto,
    LecGetTopicStatisticInOpenRegPhaseDto,
    LecGetTopicStatisticInSubmitPhaseDto
} from '../../dtos/get-statistics-topics.dtos'
import { PeriodPhaseName } from '../../../periods/enums/period-phases.enum'
import { TopicStatus } from '../../enum'
import { TopicNotFoundException } from '../../../../common/exceptions'
import { PaginationQueryDto } from '../../../../common/pagination-an/dtos/pagination-query.dto'

export class TopicRepository extends BaseRepositoryAbstract<Topic> implements TopicRepositoryInterface {
    public constructor(
        @InjectModel(Topic.name)
        private readonly topicRepository: Model<Topic>,
        private readonly paginationProvider: PaginationProvider
        //   @InjectModel(UserSavedTopics.name) private readonly archiveRepository: Model<UserSavedTopics>
    ) {
        super(topicRepository)
    }

    async addTopicGrade(topicId: string, actorId: string, body: RequestGradeTopicDto): Promise<number> {
        const newDetailGrade = {
            score: body.score,
            note: body.note,
            actorId: actorId
        }
        const existingTopic = await this.topicRepository
            .findOne({ _id: new mongoose.Types.ObjectId(topicId), deleted_at: null })
            .lean()
        if (!existingTopic) {
            throw new BadRequestException('Không tìm thấy topic hoặc đã bị xóa')
        }
        const amountGradedByActor = existingTopic.grade?.detailGrades?.length
        if (amountGradedByActor === 3) {
            throw new BadRequestException('Đã đủ số lượng điểm chi tiết, không thể thêm nữa.')
        }
        if (existingTopic.grade.detailGrades.some((grade) => grade.actorId === actorId)) {
            throw new BadRequestException('Người dùng đã chấm điểm cho đề tài này rồi.')
        }
        try {
            const result = await this.topicRepository.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(topicId), deleted_at: null },
                [
                    {
                        $set: {
                            'grade.detailGrades': {
                                $concatArrays: [{ $ifNull: ['$grade.detailGrades', []] }, [newDetailGrade]]
                            }
                        }
                    },
                    {
                        $set: {
                            'grade.averageScore': {
                                $avg: '$grade.detailGrades.score'
                            }
                        }
                    }
                ],
                { new: true }
            )
            if (result) {
                console.log(result.grade)
                console.log('Thêm điểm và cập nhật điểm trung bình thành công!')
                const count = result.grade.detailGrades.length
                return count
            }

            return amountGradedByActor
        } catch (error) {
            throw new RequestTimeoutException('Lỗi khi thêm điểm cho đề tài')
        }
    }
    async getCurrentStatusTopic(topicId: string): Promise<string> {
        const topic = await this.topicRepository.findById(topicId).lean()
        if (!topic) throw new BadRequestException('Không tìm thấy topic hoặc đã bị xóa')
        return topic.currentStatus
    }
    async findCanceledRegisteredTopicsByUserId(userId: string, role: string): Promise<GetTopicResponseDto[]> {
        let pipeline: any[] = []
        let student_reg_embedded_pl: any[] = []
        let lecturer_reg_embedded_pl: any[] = []
        pipeline.push(...this.getTopicInfoPipelineAbstract(userId))

        student_reg_embedded_pl.push({
            $match: {
                $expr: {
                    $and: [
                        { $eq: ['$userId', new mongoose.Types.ObjectId(userId)] },
                        { $eq: ['$topicId', '$$topicId'] },
                        { $ne: ['$deleted_at', null] }
                    ]
                }
            }
        })

        lecturer_reg_embedded_pl.push({
            $match: {
                $expr: {
                    $and: [
                        { $eq: ['$userId', new mongoose.Types.ObjectId(userId)] },
                        { $eq: ['$topicId', '$$topicId'] },
                        { $ne: ['$deleted_at', null] }
                    ]
                }
            }
        })

        pipeline.push(
            {
                $lookup: {
                    from: 'ref_students_topics',
                    let: { topicId: '$_id' },
                    pipeline: student_reg_embedded_pl,
                    as: 'studentCancelRefs'
                }
            },
            {
                $lookup: {
                    from: 'ref_lecturers_topics',
                    let: { topicId: '$_id' },
                    pipeline: lecturer_reg_embedded_pl,
                    as: 'lecturerCancelRefs'
                }
            }
        )

        pipeline.push({
            $addFields: {
                lastestCanceledRegisteredAt: {
                    $cond: {
                        if: { $eq: [role, UserRole.STUDENT] },
                        then: { $arrayElemAt: ['$studentCancelRefs.deleted_at', 0] },
                        else: { $arrayElemAt: ['$lecturerCancelRefs.deleted_at', 0] }
                    }
                },
                //đã bị xóa và chưa đăng ký lại
                isCanceledRegistered: {
                    $cond: {
                        if: { $eq: [role, UserRole.STUDENT] },
                        then: {
                            $expr: {
                                $and: [
                                    {
                                        $not: {
                                            $in: [
                                                new mongoose.Types.ObjectId(userId),
                                                { $ifNull: ['$studentRefs.userId', []] }
                                            ]
                                        }
                                    },
                                    { $gt: [{ $size: '$studentCancelRefs' }, 0] }
                                ]
                            }
                        },
                        else: {
                            $expr: {
                                $and: [
                                    {
                                        $not: {
                                            $in: [
                                                new mongoose.Types.ObjectId(userId),
                                                { $ifNull: ['$lecturerRefs.userId', []] }
                                            ]
                                        }
                                    },
                                    { $gt: [{ $size: '$lecturerCancelRefs' }, 0] }
                                ]
                            }
                        }
                    }
                }
            }
        })

        pipeline.push({
            $match: {
                deleted_at: null,
                isCanceledRegistered: true
            }
        })
        return await this.topicRepository.aggregate(pipeline)
    }
    async findSavedTopicsByUserId(
        userId: string,
        paginateQuery: PaginationQueryDto = new PaginationQueryDto()
    ): Promise<Paginated<Topic>> {
        let pipeline: any[] = []
        pipeline.push(...this.getTopicInfoPipelineAbstract(userId))
        pipeline.push({ $match: { deleted_at: null, isSaved: true } })

        //Lấy ra topic không null và mảng topic người dùng đã lưu khác rỗng
        const topics = await this.paginationProvider.paginateQuery<Topic>(paginateQuery, this.topicRepository, pipeline)
        return topics
    }
    async getTopicById(topicId: string, userId: string, role: string): Promise<GetTopicDetailResponseDto | null> {
        let pipeline: any[] = []
        pipeline.push(...this.getTopicInfoPipelineAbstract(userId))
        //hiển thị lịch sử các lượt đăng ký của user với topic
        // if (role === UserRole.STUDENT) {
        //     let student_reg_embedded_pl: any[] = []
        //     student_reg_embedded_pl.push({
        //         $match: {
        //             $expr: {
        //                 $and: [
        //                     { $eq: ['$topicId', '$$topicId'] },
        //                     { $eq: ['$studentId', new mongoose.Types.ObjectId(userId)] }
        //                 ]
        //             }
        //         }
        //     })
        //     pipeline.push({
        //         $lookup: {
        //             from: 'ref_students_topics',
        //             let: { topicId: '$_id' },
        //             pipeline: student_reg_embedded_pl,
        //             as: 'allRegistrationOfStudentRefs'
        //         }
        //     })
        //     pipeline.push({
        //         $addFields: {
        //             allUserRegistrations: {
        //                 $sortArray: {
        //                     input: '$allRegistrationOfStudentRefs',
        //                     sortBy: { updatedAt: -1 }
        //                 }
        //             }
        //         }
        //     })
        // } else {
        //     let lecturer_reg_embedded_pl: any[] = []
        //     lecturer_reg_embedded_pl.push({
        //         $match: {
        //             $expr: {
        //                 $and: [
        //                     { $eq: ['$topicId', '$$topicId'] },
        //                     { $eq: ['$lecturerId', new mongoose.Types.ObjectId(userId)] }
        //                 ]
        //             }
        //         }
        //     })
        //     pipeline.push({
        //         $lookup: {
        //             from: 'ref_lecturers_topics',
        //             let: { topicId: '$_id' },
        //             pipeline: lecturer_reg_embedded_pl,
        //             as: 'allRegistrationOfLecturerRefs'
        //         }
        //     })
        //     pipeline.push({
        //         $addFields: {
        //             allUserRegistrations: {
        //                 $sortArray: {
        //                     input: '$allRegistrationOfLecturerRefs',
        //                     sortBy: { updatedAt: -1 }
        //                 }
        //             }
        //         }
        //     })
        // }

        pipeline.push({
            $match: { _id: new mongoose.Types.ObjectId(topicId), deleted_at: null }
        })
        const topic = await this.topicRepository.aggregate(pipeline)
        return topic[0]
    }
    async createTopic(topicData: CreateTopicDto): Promise<string> {
        const res = await this.topicRepository.create(topicData)
        const newTopic = plainToInstance(GetTopicResponseDto, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
        return newTopic._id
    }
    async deleteTopic(topicId: string, ownerId: string): Promise<boolean> {
        const topic = await this.topicRepository.findOne({
            _id: new mongoose.Types.ObjectId(topicId),
            deleted_at: null
        })
        if (!topic) {
            throw new BadRequestException('Đề tài không tồn tại hoặc đã bị xóa.')
        }
        if (topic.createBy.toString() !== ownerId) {
            throw new BadRequestException("Bạn không có quyền xóa đề tài này. Don't owner.")
        }
        const result = await this.topicRepository.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(topicId) },
            { deleted_at: new Date() }
        )
        return result ? true : false
    }
    async findByTitle(titleVN: string, titleEng: string, periodId?: string): Promise<Topic | null> {
        return this.topicRepository
            .findOne({
                $expr: {
                    $or: [{ $eq: ['$titleVN', titleVN] }, { $eq: ['$titleEng', titleEng] }]
                },
                periodId: periodId,
                deleted_at: null
            })
            .lean()
    }
    async getAllTopics(
        userId: string,
        pagination: PaginationQueryDto = new PaginationQueryDto()
    ): Promise<Paginated<Topic>> {
        let pipeline: any[] = []
        pipeline.push(...this.getTopicInfoPipelineAbstract(userId))
        pipeline.push({ $match: { deleted_at: null } })
        return await this.paginationProvider.paginateQuery<Topic>(pagination, this.topicRepository, pipeline)
        // return await this.topicRepository.aggregate(pipeline)
    }
    async findRegisteredTopicsByUserId(userId: string): Promise<GetTopicResponseDto[]> {
        let pipeline: any[] = []
        pipeline.push(...this.getTopicInfoPipelineAbstract(userId))
        pipeline.push({ $match: { deleted_at: null, isRegistered: true } })
        //Lấy ra topic không null và mảng topic người dùng đã lưu khác rỗng
        return await this.topicRepository.aggregate(pipeline)
    }
    private getTopicInfoPipelineAbstract(userId?: string) {
        let pipeline: any[] = []
        let save_embedded_pl: any[] = []
        //kết bảng để lấy các đề tài đã lưu của user
        save_embedded_pl.push({
            $match: {
                $expr: {
                    $and: [
                        { $eq: ['$topicId', '$$topicId'] },
                        { $eq: ['$userId', new mongoose.Types.ObjectId(userId)] },
                        { $eq: ['$deleted_at', null] }
                    ]
                }
            }
        })
        pipeline.push({
            $lookup: {
                from: 'user_saved_topics',
                let: { topicId: '$_id' },
                pipeline: save_embedded_pl,
                as: 'savedInfo'
            }
        })
        // kết bảng đi để đi tìm
        // sinh viên đăng ký đề tài
        // giảng viên hướng dẫn đề tài
        let student_reg_embedded_pl: any[] = []
        let lecturer_reg_embedded_pl: any[] = []
        student_reg_embedded_pl.push({
            $match: {
                $expr: {
                    $and: [{ $eq: ['$topicId', '$$topicId'] }, { $eq: ['$deleted_at', null] }]
                }
            }
        })
        lecturer_reg_embedded_pl.push({
            $match: {
                $expr: {
                    $and: [{ $eq: ['$topicId', '$$topicId'] }, { $eq: ['$deleted_at', null] }]
                }
            }
        })
        // Lấy thông tin sinh viên liên quan đến đề tài
        pipeline.push(
            // Join topicIds qua ref_students_topics
            {
                $lookup: {
                    from: 'ref_students_topics',
                    let: { topicId: '$_id' },
                    pipeline: student_reg_embedded_pl,
                    as: 'studentRef'
                }
            },
            // Join user qua ref_students_topics
            {
                $lookup: {
                    from: 'users',
                    localField: 'studentRef.userId',
                    foreignField: '_id',
                    as: 'stuUserInfo'
                }
            }
        )
        //lấy thông tin giảng viên liên quan đến đề tài
        pipeline.push(
            // Join lecturerIds qua ref_lecturers_topics
            {
                $lookup: {
                    from: 'ref_lecturers_topics',
                    let: { topicId: '$_id' },
                    pipeline: lecturer_reg_embedded_pl,
                    as: 'lecturerRef'
                }
            },

            // Join users qua ref_lecturers_topics
            {
                $lookup: {
                    from: 'users',
                    localField: 'lecturerRef.userId',
                    foreignField: '_id',
                    as: 'lecUserInfo'
                }
            },
            // Join lecturers qua ref_lecturers_topics để lấy thông tin giảng viên
            {
                $lookup: {
                    from: 'lecturers',
                    localField: 'lecturerRef.userId',
                    foreignField: 'userId',
                    as: 'lectInfos'
                }
            },
            {
                $addFields: {
                    lecturers: {
                        $map: {
                            input: '$lecUserInfo',
                            as: 'userInfo',
                            in: {
                                $mergeObjects: [
                                    '$$userInfo',
                                    {
                                        lecturerInfo: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: '$lectInfos',
                                                        as: 'lecInfo',
                                                        cond: { $eq: ['$$lecInfo.userId', '$$userInfo._id'] }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        )
        pipeline.push(
            //lấy major
            {
                $lookup: {
                    from: 'majors',
                    localField: 'majorId',
                    foreignField: '_id',
                    as: 'major'
                }
            },

            //join fields
            {
                $lookup: {
                    from: 'fields',
                    localField: 'fieldIds',
                    foreignField: '_id',
                    as: 'fields'
                }
            },
            //join requirements
            {
                $lookup: {
                    from: 'requirements',
                    localField: 'requirementIds',
                    foreignField: '_id',
                    as: 'requirements'
                }
            }
        )
        if (userId) {
            pipeline.push({
                $addFields: {
                    isRegistered: {
                        $or: [
                            {
                                $in: [new mongoose.Types.ObjectId(userId), { $ifNull: ['$studentRef.userId', []] }]
                            },
                            {
                                $in: [new mongoose.Types.ObjectId(userId), { $ifNull: ['$lecturerRef.userId', []] }]
                            }
                        ]
                    },
                    isSaved: { $gt: [{ $size: { $ifNull: ['$savedInfo', []] } }, 0] }
                }
            })
        }
        //add project vô nè
        pipeline.push({
            $project: {
                title: 1,
                description: 1,
                type: 1,
                status: 1,
                createBy: 1,
                deadline: 1,
                maxStudents: 1,
                createdAt: 1,
                updatedAt: 1,
                periodId: 1,
                currentStatus: 1,
                currentPhase: 1,
                isRegistered: 1,
                isSaved: 1,
                major: { $arrayElemAt: ['$major', 0] },
                lecturers: 1,
                students: '$stuUserInfo',
                fields: `$fields`,
                requirements: `$requirements`
            }
        })

        return pipeline
    }
    async getTopicsInPeriod(periodId: string, query: RequestGetTopicsInPeriodDto): Promise<Paginated<Topic>> {
        const pipelineSub: any = []
        pipelineSub.push(...this.getTopicInfoPipelineAbstract())
        pipelineSub.push({ $match: { periodId: new mongoose.Types.ObjectId(periodId) } })
        return await this.paginationProvider.paginateQuery<Topic>(query, this.topicRepository)
    }
    async getTopicsInPhase(phaseId: string, query: RequestGetTopicsInPhaseDto): Promise<Paginated<Topic>> {
        const pipelineSub: any = []
        pipelineSub.push(...this.getTopicInfoPipelineAbstract())
        pipelineSub.push({ $match: { currentPhaseId: new mongoose.Types.ObjectId(phaseId) } })
        return await this.paginationProvider.paginateQuery<Topic>(query, this.topicRepository)
    }
    // lấy thống kê
    async getStatisticTopicsInSubmitPhase(periodId: string): Promise<GetTopicStatisticInSubmitPhaseDto> {
        const submitPhase = PeriodPhaseName.SUBMIT_TOPIC
        //Kiểm tra kỳ có pha nộp đề tài chưa
        //Lấy các thông số thuộc pha, trong kì
        const topicsFigures = await this.topicRepository.aggregate([
            {
                $facet: {
                    rejectedTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.Rejected,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    approvedTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.Approved,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    submittedTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.Submitted,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    underReviewTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.UnderReview,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    totalTopicsInPhase: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentPhase: submitPhase,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ]
                }
            }
        ])
        return {
            periodId: periodId,
            currentPhase: submitPhase,
            rejectedTopicsNumber: topicsFigures[0].rejectedTopics[0]?.count || 0,
            approvalTopicsNumber: topicsFigures[0].approvedTopics[0]?.count || 0,
            submittedTopicsNumber: topicsFigures[0].submittedTopics[0]?.count || 0,
            underReviewTopicsNumber: topicsFigures[0].underReviewTopics[0]?.count || 0,
            totalTopicsNumber: topicsFigures[0].totalTopicsInPhase[0]?.count || 0
        }
    }
    async getStatisticsOpenRegistrationPhase(periodId: string): Promise<GetTopicStatisticInOpenRegPhaseDto> {
        const currentPhase = PeriodPhaseName.OPEN_REGISTRATION
        const topicsFigures = await this.topicRepository.aggregate([
            {
                $facet: {
                    emptyTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.PendingRegistration,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    registeredTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.Registered,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    fullTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.Full,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    totalTopicsInPhase: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentPhase: currentPhase,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ]
                }
            }
        ])
        return {
            periodId: periodId,
            currentPhase: currentPhase,
            emptyTopicsNumber: topicsFigures[0].emptyTopics[0]?.count || 0,
            registeredTopicsNumber: topicsFigures[0].registeredTopics[0]?.count || 0,
            fullTopicsNumber: topicsFigures[0].fullTopics[0]?.count || 0,
            totalTopicsInPhaseNumber: topicsFigures[0].totalTopicsInPhase[0]?.count || 0
        }
    }
    async getStatisticsExecutionPhase(periodId: string): Promise<GetTopicsStatisticInExecutionPhaseDto> {
        const currentPhase = PeriodPhaseName.EXECUTION
        const topicsFigures = await this.topicRepository.aggregate([
            {
                $facet: {
                    inNormalProcessing: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.InProgress,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    delayedTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.Delayed,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    pausedTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.Paused,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    submittedForReviewTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.SubmittedForReview,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    readyForEvaluationNumber: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                curentPhase: currentPhase,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ]
                }
            }
        ])
        return {
            periodId: periodId,
            currentPhase: currentPhase,
            inNormalProcessingNumber: topicsFigures[0]?.inNormalProcessing[0]?.count || 0,
            delayedTopicsNumber: topicsFigures[0]?.delayedTopics[0]?.count || 0,
            pausedTopicsNumber: topicsFigures[0]?.pausedTopics[0]?.count || 0,
            submittedTopicsNumber: topicsFigures[0]?.submittedForReviewTopics[0]?.count || 0,
            readyForEvaluationNumber: topicsFigures[0]?.readyForEvaluationNumber[0]?.count || 0
        }
    }
    async getStatisticsCompletionPhase(periodId: string): Promise<GetTopicsStatisticInCompletionPhaseDto> {
        const currentPhase = PeriodPhaseName.COMPLETION
        const topicsFigures = await this.topicRepository.aggregate([
            {
                $facet: {
                    readyForEvaluation: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentPhase: PeriodPhaseName.EXECUTION,
                                currentStatus: TopicStatus.AwaitingEvaluation,
                                deleted_at: null
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ],
                    gradedTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.Graded,
                                deleted_at: null
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ],
                    archivedTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.Archived,
                                deleted_at: null
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ],
                    rejectedFinalTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.RejectedFinal,
                                deleted_at: null
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ]
                }
            }
        ])
        return {
            periodId: periodId,
            currentPhase: currentPhase,
            readyForEvaluationNumber: topicsFigures[0]?.readyForEvaluation[0]?.count || 0,
            gradedTopicsNumber: topicsFigures[0]?.gradedTopics[0]?.count || 0,
            achivedTopicsNumber: topicsFigures[0]?.archivedTopics[0]?.count || 0,
            rejectedFinalTopicsNumber: topicsFigures[0]?.rejectedFinalTopics[0]?.count || 0
        }
    }

    async lecturerGetStatisticTopicsInSubmitPhase(
        periodId: string,
        lecturerId: string
    ): Promise<LecGetTopicStatisticInSubmitPhaseDto> {
        const submitPhase = PeriodPhaseName.SUBMIT_TOPIC
        //Kiểm tra kỳ có pha nộp đề tài chưa
        //Lấy các thông số thuộc pha, trong kì
        const topicsFigures = await this.topicRepository.aggregate([
            {
                $facet: {
                    rejectedTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.Rejected,
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    approvedTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.Approved,
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),

                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    submittedTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.Submitted,
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    underReviewTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.UnderReview,
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    totalTopicsInPhase: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentPhase: submitPhase,
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ]
                }
            }
        ])
        return {
            periodId: periodId,
            currentPhase: submitPhase,
            rejectedTopicsNumber: topicsFigures[0].rejectedTopics[0]?.count || 0,
            approvalTopicsNumber: topicsFigures[0].approvedTopics[0]?.count || 0,
            submittedTopicsNumber: topicsFigures[0].submittedTopics[0]?.count || 0,
            underReviewTopicsNumber: topicsFigures[0].underReviewTopics[0]?.count || 0,
            totalTopicsNumber: topicsFigures[0].totalTopicsInPhase[0]?.count || 0
        }
    }

    async lecturerGetStatisticsOpenRegistrationPhase(
        periodId: string,
        lecturerId: string
    ): Promise<LecGetTopicStatisticInOpenRegPhaseDto> {
        const currentPhase = PeriodPhaseName.OPEN_REGISTRATION
        const topicsFigures = await this.topicRepository.aggregate([
            {
                $facet: {
                    emptyTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.PendingRegistration,
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    registeredTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.Registered,
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    fullTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                currentStatus: TopicStatus.Full,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    totalTopicsInPhase: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                currentPhase: currentPhase,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ]
                }
            }
        ])
        return {
            periodId: periodId,
            currentPhase: currentPhase,
            emptyTopicsNumber: topicsFigures[0].emptyTopics[0]?.count || 0,
            registeredTopicsNumber: topicsFigures[0].registeredTopics[0]?.count || 0,
            totalTopicsInPhaseNumber: topicsFigures[0].totalTopicsInPhase[0]?.count || 0
        }
    }
    async lecturerGetStatisticsExecutionPhase(
        periodId: string,
        lecturerId: string
    ): Promise<LecGetTopicsStatisticInExecutionPhaseDto> {
        const currentPhase = PeriodPhaseName.EXECUTION
        const topicsFigures = await this.topicRepository.aggregate([
            {
                $facet: {
                    canceledTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentPhase: PeriodPhaseName.OPEN_REGISTRATION,
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                currentStatus: TopicStatus.Cancelled,
                                deleted_at: null
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ],
                    inNormalProcessing: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                currentStatus: TopicStatus.InProgress,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    delayedTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                currentStatus: TopicStatus.Delayed,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    pausedTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                currentStatus: TopicStatus.Paused,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    submittedForReviewTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.SubmittedForReview,
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    readyForEvaluationNumber: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                curentPhase: currentPhase,
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ]
                }
            }
        ])
        return {
            periodId: periodId,
            currentPhase: currentPhase,
            canceledRegisteredTopicsNumber: topicsFigures[0]?.canceledTopics[0]?.count || 0,
            inNormalProcessingNumber: topicsFigures[0]?.inNormalProcessing[0]?.count || 0,
            delayedTopicsNumber: topicsFigures[0]?.delayedTopics[0]?.count || 0,
            pausedTopicsNumber: topicsFigures[0]?.pausedTopics[0]?.count || 0,
            submittedTopicsNumber: topicsFigures[0]?.submittedForReviewTopics[0]?.count || 0,
            readyForEvaluationNumber: topicsFigures[0]?.readyForEvaluationNumber[0]?.count || 0
        }
    }

    async lecturerGetStatisticsCompletionPhase(
        periodId: string,
        lecturerId: string
    ): Promise<LecGetTopicsStatisticInCompletionPhaseDto> {
        const currentPhase = PeriodPhaseName.COMPLETION
        const topicsFigures = await this.topicRepository.aggregate([
            {
                $facet: {
                    readyForEvaluation: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentPhase: PeriodPhaseName.EXECUTION,
                                currentStatus: TopicStatus.AwaitingEvaluation,
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                deleted_at: null
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ],
                    gradedTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.Graded,
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                deleted_at: null
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ],
                    archivedTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.Archived,
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                deleted_at: null
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ],
                    rejectedFinalTopics: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                currentStatus: TopicStatus.RejectedFinal,
                                lecturerIds: new mongoose.Types.ObjectId(lecturerId),
                                deleted_at: null
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ]
                }
            }
        ])
        return {
            periodId: periodId,
            currentPhase: currentPhase,
            readyForEvaluationNumber: topicsFigures[0]?.readyForEvaluation[0]?.count || 0,
            gradedTopicsNumber: topicsFigures[0]?.gradedTopics[0]?.count || 0,
            achivedTopicsNumber: topicsFigures[0]?.archivedTopics[0]?.count || 0,
            rejectedFinalTopicsNumber: topicsFigures[0]?.rejectedFinalTopics[0]?.count || 0
        }
    }
    async addFieldToTopicQuick(topicId: string, fieldId: string, userId: string): Promise<Topic | null> {
        return await this.topicRepository
            .findByIdAndUpdate(topicId, { createBy: userId, $push: { fieldIds: fieldId } }, { new: true })
            .lean()
    }
    async removeFieldFromTopicQuick(topicId: string, fieldId: string, userId: string): Promise<Topic | null> {
        return await this.topicRepository
            .findByIdAndUpdate(topicId, { createBy: userId, $pull: { fieldIds: fieldId } }, { new: true })
            .lean()
    }
    async addRequirementToTopicQuick(topicId: string, requirementId: string, userId: string): Promise<Topic | null> {
        return await this.topicRepository
            .findByIdAndUpdate(topicId, { createBy: userId, $push: { requirementIds: requirementId } }, { new: true })
            .lean()
    }
    async removeRequirementFromTopicQuick(
        topicId: string,
        requirementId: string,
        userId: string
    ): Promise<Topic | null> {
        return await this.topicRepository
            .findByIdAndUpdate(topicId, { createBy: userId, $pull: { requirementIds: requirementId } }, { new: true })
            .lean()
    }
    async uploadManyFilesToTopic(topicId: string, fileIds: string[]): Promise<number> {
        try {
            const res = await this.topicRepository
                .findByIdAndUpdate(
                    topicId,
                    {
                        $push: { fileIds: { $each: fileIds } }
                    },
                    { new: true }
                )
                .lean()
            return res?.fileIds.length || 0
        } catch (error) {
            throw new BadRequestException('Lỗi tải file lên đề tài')
        }
    }
    async deleteManyFilesFromTopic(topicId: string, fileIds?: string[]): Promise<boolean> {
        try {
            const res = await this.topicRepository.updateMany(
                { _id: new mongoose.Types.ObjectId(topicId), deleted_at: null },
                fileIds
                    ? {
                          $pull: { fileIds: { $in: fileIds } }
                      }
                    : { $set: { fileIds: [] } }
            )
            return res.modifiedCount > 0
        } catch (error) {
            throw new BadRequestException('Lỗi xóa file khỏi đề tài')
        }
    }
    async deleteFileFromTopic(topicId: string, fileId: string): Promise<boolean> {
        try {
            const res = await this.topicRepository.updateMany(
                { _id: new mongoose.Types.ObjectId(topicId), deleted_at: null },
                {
                    $pull: { fileIds: fileId }
                }
            )
            return res.modifiedCount > 0
        } catch (error) {
            throw new BadRequestException('Lỗi xóa file khỏi đề tài')
        }
    }
}
