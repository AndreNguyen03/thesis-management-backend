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
import mongoose, { Model, mongo } from 'mongoose'
import { UserRole } from '../../../../auth/enum/user-role.enum'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'
import { BadRequestException, RequestTimeoutException } from '@nestjs/common'
import { RequestGradeTopicDto } from '../../dtos/request-grade-topic.dtos'

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
        const amountGradedByActor = existingTopic.grade.detailGrades.length
        if (amountGradedByActor === 3) {
            throw new BadRequestException('Đã đủ số lượng điểm chi tiết, không thể thêm nữa.')
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
                        { $eq: ['$studentId', new mongoose.Types.ObjectId(userId)] },
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
                        { $eq: ['$lecturerId', new mongoose.Types.ObjectId(userId)] },
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
                                                { $ifNull: ['$studentRefs.studentId', []] }
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
                                                { $ifNull: ['$lecturerRefs.lecturerId', []] }
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
    async findSavedTopicsByUserId(userId: string): Promise<GetTopicResponseDto[]> {
        let pipeline: any[] = []
        pipeline.push(...this.getTopicInfoPipelineAbstract(userId))
        pipeline.push({ $match: { deleted_at: null, isSaved: true } })

        //Lấy ra topic không null và mảng topic người dùng đã lưu khác rỗng
        const topic = await this.topicRepository.aggregate(pipeline)
        return topic
    }
    async getTopicById(topicId: string, userId: string, role: string): Promise<GetTopicDetailResponseDto | null> {
        let pipeline: any[] = []
        pipeline.push(...this.getTopicInfoPipelineAbstract(userId))

        if (role === UserRole.STUDENT) {
            let student_reg_embedded_pl: any[] = []
            student_reg_embedded_pl.push({
                $match: {
                    $expr: {
                        $and: [
                            { $eq: ['$topicId', '$$topicId'] },
                            { $eq: ['$studentId', new mongoose.Types.ObjectId(userId)] }
                        ]
                    }
                }
            })
            pipeline.push({
                $lookup: {
                    from: 'ref_students_topics',
                    let: { topicId: '$_id' },
                    pipeline: student_reg_embedded_pl,
                    as: 'allRegistrationOfStudentRefs'
                }
            })
            pipeline.push({
                $addFields: {
                    allUserRegistrations: {
                        $sortArray: {
                            input: '$allRegistrationOfStudentRefs',
                            sortBy: { updatedAt: -1 }
                        }
                    }
                }
            })
        } else {
            let lecturer_reg_embedded_pl: any[] = []
            lecturer_reg_embedded_pl.push({
                $match: {
                    $expr: {
                        $and: [
                            { $eq: ['$topicId', '$$topicId'] },
                            { $eq: ['$lecturerId', new mongoose.Types.ObjectId(userId)] }
                        ]
                    }
                }
            })
            pipeline.push({
                $lookup: {
                    from: 'ref_lecturers_topics',
                    let: { topicId: '$_id' },
                    pipeline: lecturer_reg_embedded_pl,
                    as: 'allRegistrationOfLecturerRefs'
                }
            })
            pipeline.push({
                $addFields: {
                    allUserRegistrations: {
                        $sortArray: {
                            input: '$allRegistrationOfLecturerRefs',
                            sortBy: { updatedAt: -1 }
                        }
                    }
                }
            })
        }

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
    async findByTitle(title: string): Promise<Topic | null> {
        return this.topicRepository.findOne({ title, deleted_at: null }).lean()
    }
    async getAllTopics(userId: string): Promise<GetTopicResponseDto[]> {
        let pipeline: any[] = []
        pipeline.push(...this.getTopicInfoPipelineAbstract(userId))
        pipeline.push({ $match: { deleted_at: null } })
        return await this.topicRepository.aggregate(pipeline)
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
        // lấy các bài viết đã lưu liên quan tới cặp {userId,topicId(for each)}
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
        // tìm kiếm đăng ký liên quan tới cặp {studentId,topicId(for each)}
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
        pipeline.push(
            // Join students qua ref_students_topics
            {
                $lookup: {
                    from: 'ref_students_topics',
                    let: { topicId: '$_id' },
                    pipeline: student_reg_embedded_pl,
                    as: 'studentRefs'
                }
            }, // Join lecturers qua ref_lecturer_topic
            {
                $lookup: {
                    from: 'ref_lecturers_topics',
                    let: { topicId: '$_id' },
                    pipeline: lecturer_reg_embedded_pl,
                    as: 'lecturerRefs'
                }
            }
        )
        pipeline.push(
            //join major
            {
                $lookup: {
                    from: 'majors',
                    localField: 'majorId',
                    foreignField: '_id',
                    as: 'major'
                }
            },

            // Join students qua ref_students_topics
            {
                $lookup: {
                    from: 'lecturers',
                    localField: 'lecturerRefs.lecturerId',
                    foreignField: '_id',
                    as: 'lecturers'
                }
            },
            // Join students qua ref_students_topics
            {
                $lookup: {
                    from: 'students',
                    localField: 'studentRefs.studentId',
                    foreignField: '_id',
                    as: 'students'
                }
            },
            //join fields qua ref_fields_topics
            {
                $lookup: {
                    from: 'ref_fields_topics',
                    localField: '_id',
                    foreignField: 'topicId',
                    as: 'fieldRefs'
                }
            },
            {
                $lookup: {
                    from: 'fields',
                    localField: 'fieldRefs.fieldId',
                    foreignField: '_id',
                    as: 'fields'
                }
            },
            //join requirements qua ref_requirements_topics
            {
                $lookup: {
                    from: 'ref_requirements_topics',
                    localField: '_id',
                    foreignField: 'topicId',
                    as: 'requirementRefs'
                }
            },
            {
                $lookup: {
                    from: 'requirements',
                    localField: 'requirementRefs.requirementId',
                    foreignField: '_id',
                    as: 'requirements'
                }
            },
            {
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
                    isRegistered: 1,
                    isSaved: 1,
                    major: { $arrayElemAt: ['$major.name', 0] },
                    lecturerNames: {
                        $map: {
                            input: '$lecturers',
                            as: 'lecturer',
                            in: '$$lecturer.fullName'
                        }
                    },
                    studentNames: {
                        $map: {
                            input: '$students',
                            as: 'student',
                            in: '$$student.fullName'
                        }
                    },
                    fieldNames: {
                        $map: {
                            input: '$fields',
                            as: 'field',
                            in: '$$field.name'
                        }
                    },
                    requirementNames: {
                        $map: {
                            input: '$requirements',
                            as: 'requirement',
                            in: '$$requirement.name'
                        }
                    }
                }
            }
        )
        if (userId) {
            pipeline.push({
                $addFields: {
                    isRegistered: {
                        $or: [
                            {
                                $in: [new mongoose.Types.ObjectId(userId), { $ifNull: ['$studentRefs.studentId', []] }]
                            },
                            {
                                $in: [
                                    new mongoose.Types.ObjectId(userId),
                                    { $ifNull: ['$lecturerRefs.lecturerId', []] }
                                ]
                            }
                        ]
                    },
                    isSaved: { $gt: [{ $size: '$savedInfo' }, 0] }
                }
            })
        }
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
}
