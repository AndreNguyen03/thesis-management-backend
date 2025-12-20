import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { plainToInstance } from 'class-transformer'
import { Topic } from '../../schemas/topic.schemas'
import {
    CreateTopicDto,
    GetMiniTopicInfo,
    GetTopicDetailResponseDto,
    GetTopicResponseDto,
    PaginationTopicsQueryParams,
    PatchTopicDto,
    RequestGetTopicsInAdvanceSearchParams,
    RequestGetTopicsInPhaseParams
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
import { de } from '@faker-js/faker/.'
import { StudentRegistrationStatus } from '../../../registrations/enum/student-registration-status.enum'
import { allow } from 'joi'
import { pipe } from 'rxjs'
import { LecturerRoleEnum } from '../../../registrations/enum/lecturer-role.enum'
import { title } from 'process'
import { GetMiniMiniMajorDto } from '../../../majors/dtos/get-major.dto'
import { pipeline } from 'stream'
import { IsArray } from 'class-validator'
import { GetUploadedFileDto } from '../../../upload-files/dtos/upload-file.dtos'
import path from 'path'
import { SubmittedTopicParamsDto } from '../../dtos/query-params.dtos'

export class TopicRepository extends BaseRepositoryAbstract<Topic> implements TopicRepositoryInterface {
    public constructor(
        @InjectModel(Topic.name)
        private readonly topicRepository: Model<Topic>,
        private readonly paginationProvider: PaginationProvider
        //   @InjectModel(UserSavedTopics.name) private readonly archiveRepository: Model<UserSavedTopics>
    ) {
        super(topicRepository)
    }

    async getMiniTopicInfo(topicId: string): Promise<GetMiniTopicInfo> {
        const topicData = await this.topicRepository
            .findOne({ _id: new mongoose.Types.ObjectId(topicId), deleted_at: null })
            .lean()
        if (!topicData) {
            throw new BadRequestException('Không tìm thấy topic hoặc đã bị xóa')
        }
        return {
            _id: topicData._id.toString(),
            titleVN: topicData.titleVN,
            titleEng: topicData.titleEng,
            createBy: topicData.createBy.toString()
        }
    }
    async updateTopic(id: string, topicData: PatchTopicDto): Promise<Topic | null> {
        return await this.topicRepository.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(id), deleted_at: null },
            { $set: topicData },
            { new: true }
        )
    }
    addTopicGrade(topicId: string, actorId: string, body: RequestGradeTopicDto): Promise<number> {
        throw new Error('Method not implemented.')
    }
    // async addTopicGrade(topicId: string, actorId: string, body: RequestGradeTopicDto): Promise<number> {
    //     const newDetailGrade = {
    //         score: body.score,
    //         note: body.note,
    //         actorId: actorId
    //     }
    //     const existingTopic = await this.topicRepository
    //         .findOne({ _id: new mongoose.Types.ObjectId(topicId), deleted_at: null })
    //         .lean()
    //     if (!existingTopic) {
    //         throw new BadRequestException('Không tìm thấy topic hoặc đã bị xóa')
    //     }
    //     const amountGradedByActor = existingTopic.grade?.detailGrades?.length || 0
    //     if (amountGradedByActor === 3) {
    //         throw new BadRequestException('Đã đủ số lượng điểm chi tiết, không thể thêm nữa.')
    //     }
    //     if (existingTopic.grade?.detailGrades?.some((grade) => grade.actorId === actorId)) {
    //         throw new BadRequestException('Người dùng đã chấm điểm cho đề tài này rồi.')
    //     }
    //     try {
    //         const result = await this.topicRepository.findOneAndUpdate(
    //             { _id: new mongoose.Types.ObjectId(topicId), deleted_at: null },
    //             [
    //                 {
    //                     $set: {
    //                         'grade.detailGrades': {
    //                             $concatArrays: [{ $ifNull: ['$grade.detailGrades', []] }, [newDetailGrade]]
    //                         }
    //                     }
    //                 },
    //                 {
    //                     $set: {
    //                         'grade.averageScore': {
    //                             $avg: '$grade.detailGrades.score'
    //                         }
    //                     }
    //                 }
    //             ],
    //             { new: true }
    //         )
    //         if (result) {
    //             console.log(result.grade)
    //             console.log('Thêm điểm và cập nhật điểm trung bình thành công!')
    //             const count = result.grade.detailGrades.length
    //             return count
    //         }

    //         return amountGradedByActor
    //     } catch (error) {
    //         throw new RequestTimeoutException('Lỗi khi thêm điểm cho đề tài')
    //     }
    // }
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
        // lấy thông tin file đính kèm với topic
        pipeline.push(
            ...[
                {
                    $lookup: {
                        from: 'files',
                        localField: 'fileIds',
                        foreignField: '_id',
                        as: 'filesInfo'
                    }
                },
                // Lookup actor cho từng file
                {
                    $lookup: {
                        from: 'users',
                        localField: 'filesInfo.actorId',
                        foreignField: '_id',
                        as: 'fileActors'
                    }
                },
                // Map lại files: đổi actorId thành actor object
                {
                    $addFields: {
                        files: {
                            $map: {
                                input: '$filesInfo',
                                as: 'file',
                                in: {
                                    $mergeObjects: [
                                        '$$file',
                                        {
                                            actor: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: '$fileActors',
                                                            as: 'actor',
                                                            cond: { $eq: ['$$actor._id', '$$file.actorId'] }
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
            ]
        )
        //lấy thông tin chi tiết phasehistory
        pipeline.push(
            ...[
                {
                    $lookup: {
                        from: 'users',
                        localField: 'phaseHistories.actor',
                        foreignField: '_id',
                        as: 'phaseHistoryActors'
                    }
                },

                {
                    $lookup: {
                        from: 'lecturers',
                        localField: 'phaseHistoryActors._id',
                        foreignField: 'userId',
                        as: 'lectus'
                    }
                },
                {
                    $addFields: {
                        phaseHistories: {
                            $map: {
                                input: '$phaseHistories',
                                as: 'phaseHistory',
                                in: {
                                    $mergeObjects: [
                                        ,
                                        '$$phaseHistory',
                                        {
                                            actor: {
                                                $mergeObjects: [
                                                    {
                                                        $arrayElemAt: [
                                                            {
                                                                $filter: {
                                                                    input: '$lectus',
                                                                    as: 'lec',
                                                                    cond: {
                                                                        $eq: ['$$lec.userId', '$$phaseHistory.actor']
                                                                    }
                                                                }
                                                            },
                                                            0
                                                        ]
                                                    },
                                                    {
                                                        $arrayElemAt: [
                                                            {
                                                                $filter: {
                                                                    input: '$phaseHistoryActors',
                                                                    as: 'actor',
                                                                    cond: {
                                                                        $eq: ['$$actor._id', '$$phaseHistory.actor']
                                                                    }
                                                                }
                                                            },
                                                            0
                                                        ]
                                                    }
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            ]
        )
        pipeline.push({
            $project: {
                titleEng: 1,
                titleVN: 1,
                description: 1,
                type: 1,
                status: 1,
                createBy: 1,
                createByInfo: '$createByInfo',
                deadline: 1,
                maxStudents: 1,
                createdAt: 1,
                updatedAt: 1,
                periodId: 1,
                currentStatus: 1,
                currentPhase: 1,
                registrationStatus: 1,
                phaseHistories: 1,
                isSaved: 1,
                major: 1,
                lecturers: 1,
                students: `$students`,
                fields: `$fields`,
                requirements: `$requirements`,
                requirementIds: 1,
                grade: 1,
                files: 1,
                isEditable: 1,
                allowManualApproval: 1
            }
        })
        pipeline.push({
            $match: { _id: new mongoose.Types.ObjectId(topicId), deleted_at: null }
        })
        const topic = await this.topicRepository.aggregate(pipeline)
        return topic[0]
    }
    async createTopic(topicData: CreateTopicDto): Promise<string> {
        const res = await this.topicRepository.create(topicData)
        console.log(res)
        const newTopic = plainToInstance(GetTopicResponseDto, res, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
        return newTopic._id
    }
    //chỉ xóa thẳng những đề tài ở trạng thái draft và do chính người dùng tạo
    async deleteTopics(topicIds: string[], ownerId: string): Promise<boolean> {
        const topics = await this.topicRepository.deleteMany({
            _id: { $in: topicIds.map((id) => new mongoose.Types.ObjectId(id)) },
            currentStatus: TopicStatus.Draft,
            createBy: new mongoose.Types.ObjectId(ownerId)
        })
        if (!topics) {
            throw new BadRequestException('Đề tài không tồn tại hoặc đã bị xóa.')
        }

        return topics ? true : false
    }
    async findByTitle(titleVN: string, titleEng: string, periodId: string): Promise<Topic | null> {
        console.log('titleVN, titleEng, periodId', titleVN, titleEng, periodId)
        return this.topicRepository
            .findOne({
                $expr: {
                    $or: [{ $eq: ['$titleVN', titleVN] }, { $eq: ['$titleEng', titleEng] }]
                },
                periodId: new mongoose.Types.ObjectId(periodId),
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

    async getTopicsOfPeriod(
        userId: string,
        periodId: string,
        query: PaginationTopicsQueryParams
    ): Promise<Paginated<Topic>> {
        console.log('query', query, periodId)
        let pipelineSub: any[] = []
        pipelineSub.push(...this.getTopicInfoPipelineAbstract(userId))
        pipelineSub.push(...this.pipelineSubmittedTopics())
        pipelineSub.push({
            $match: {
                periodId: new mongoose.Types.ObjectId(periodId),
                ...(query.phase ? { currentPhase: query.phase } : {}),
                ...(query.status ? { currentStatus: query.status } : {}),
                deleted_at: null
            }
        })
        //  console.log('pipelineSub', pipelineSub)
        return await this.paginationProvider.paginateQuery<Topic>(query, this.topicRepository, pipelineSub)
    }

    async findRegisteredTopicsByUserId(userId: string, query: PaginationQueryDto): Promise<Paginated<Topic>> {
        let pipeline: any[] = []
        pipeline.push(...this.getTopicInfoPipelineAbstract(userId))
        pipeline.push({ $match: { deleted_at: null, registrationStatus: { $ne: null } } })
        //Lấy ra topic không null và mảng topic người dùng đã lưu khác rỗng
        return await this.paginationProvider.paginateQuery<Topic>(query, this.topicRepository, pipeline)
    }
    private getTopicInfoPipelineAbstract(userId?: string) {
        let pipeline: any[] = []
        let save_embedded_pl: any[] = []
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
        //kết bảng để trả về kết quả: người này có lưu đề tài hay không
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
                    $and: [
                        { $eq: ['$topicId', '$$topicId'] },
                        { $eq: ['$deleted_at', null] },
                        {
                            $not: {
                                $in: [
                                    '$status',
                                    [
                                        StudentRegistrationStatus.CANCELLED,
                                        StudentRegistrationStatus.REJECTED,
                                        StudentRegistrationStatus.WITHDRAWN
                                    ]
                                ]
                            }
                        }
                    ]
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
        // Lấy thông tin sinh viên liên quan đến đề tài ( chỉ lấy cơ bản)
        pipeline.push(
            // Join topicIds qua ref_students_topics
            {
                $lookup: {
                    from: 'ref_students_topics',
                    let: { topicId: '$_id' },
                    pipeline: student_reg_embedded_pl,
                    as: 'studentRef'
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
                                    {
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
                                    },
                                    '$$userInfo'
                                ]
                            }
                        }
                    }
                }
            },
            //Lấy roleIntopic của giảng viên
            {
                $addFields: {
                    lecturers: {
                        $map: {
                            input: '$lecturers',
                            as: 'lect',
                            in: {
                                $mergeObjects: [
                                    '$$lect',
                                    {
                                        roleInTopic: {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: {
                                                            $filter: {
                                                                input: '$lecturerRef',
                                                                as: 'ref',
                                                                cond: { $eq: ['$$ref.userId', '$$lect._id'] }
                                                            }
                                                        },
                                                        as: 'filteredRef',
                                                        in: '$$filteredRef.role'
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
            },
            //Lấy facultyName của giảng viên
            {
                $lookup: {
                    from: 'faculties',
                    localField: 'lecturers.facultyId',
                    foreignField: '_id',
                    as: 'facultyInfo'
                }
            },
            {
                $addFields: {
                    lecturers: {
                        $map: {
                            input: '$lecturers',
                            as: 'lecturer',
                            in: {
                                $mergeObjects: [
                                    '$$lecturer',

                                    {
                                        facultyName: {
                                            $arrayElemAt: [
                                                {
                                                    $map: {
                                                        input: {
                                                            $filter: {
                                                                input: '$facultyInfo',
                                                                as: 'faculty',
                                                                cond: { $eq: ['$$faculty._id', '$$lecturer.facultyId'] }
                                                            }
                                                        },
                                                        as: 'fac',
                                                        in: '$$fac.name'
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
        //lấy thông tin ngành, lĩnh vực, yêu cầu, người tạo đề tài
        pipeline.push(
            //lấy major
            {
                $lookup: {
                    from: 'majors',
                    localField: 'majorId',
                    foreignField: '_id',
                    as: 'majorsInfo'
                }
            },
            {
                $unwind: {
                    path: '$majorsInfo',
                    preserveNullAndEmptyArrays: true
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
            },
            //join user
            {
                $lookup: {
                    from: 'users',
                    localField: 'createBy',
                    foreignField: '_id',
                    as: 'createByInfo'
                }
            },
            {
                $unwind: { path: '$createByInfo', preserveNullAndEmptyArrays: true }
            }
        )
        if (userId) {
            pipeline.push({
                $addFields: {
                    isSaved: { $gt: [{ $size: { $ifNull: ['$savedInfo', []] } }, 0] }
                }
            })
        }
        //Kiểm tra xem người dùng có là giảng viên và có quyền chỉnh sửa hay không
        pipeline.push({
            $addFields: {
                isEditable: {
                    $in: [new mongoose.Types.ObjectId(userId), { $ifNull: ['$lecturerRef.userId', []] }]
                }
            }
        })
        pipeline.push(
            ...[
                {
                    $lookup: {
                        from: 'periods',
                        localField: 'periodId',
                        foreignField: '_id',
                        as: 'periodInfo'
                    }
                },
                {
                    $unwind: { path: '$periodInfo', preserveNullAndEmptyArrays: true }
                }
            ]
        )
        //add project vô nè
        pipeline.push({
            $project: {
                titleEng: 1,
                titleVN: 1,
                description: 1,
                type: 1,
                status: 1,
                createBy: 1,
                createByInfo: '$createByInfo',
                deadline: 1,
                maxStudents: 1,
                createdAt: 1,
                updatedAt: 1,
                periodId: 1,
                currentStatus: 1,
                currentPhase: 1,
                phaseHistories: 1,
                isSaved: 1,
                major: '$majorsInfo',
                lecturers: 1,
                studentsNum: { $size: { $ifNull: ['$studentRef', []] } },
                fields: `$fields`,
                requirements: `$requirements`,
                fieldIds: 1,
                fileIds: 1,
                requirementIds: 1,
                grade: 1,
                isEditable: 1,
                allowManualApproval: 1,
                periodInfo: 1,
                defenseResults: 1,
                studentRef: 1,
                stats: 1,
                defenseResult: 1,
                registrationStatus: { $arrayElemAt: [{ $ifNull: ['$studentRef.status', []] }, 0] }
            }
        })

        return pipeline
    }

    async getTopicsInPhaseHistory(
        periodId: string,
        query: RequestGetTopicsInPhaseParams,
        ownerId?: string
    ): Promise<Paginated<Topic>> {
        console.log('query', query, periodId)
        const pipelineSub: any = []
        pipelineSub.push(...this.getTopicInfoPipelineAbstract())
        // // Thêm trường lastPhaseHistory là phần tử cuối cùng thỏa điều kiện (là trạng thái cuối cùng của pha đầu vào) trong phaseHistories
        pipelineSub.push(
            {
                $addFields: {
                    lastStatusInPhaseHistory: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: '$phaseHistories',
                                    as: 'ph',
                                    cond: {
                                        $and: [
                                            ...(query.phase ? [{ $eq: ['$$ph.phaseName', query.phase] }] : []),
                                            ...(query.status ? [{ $eq: ['$$ph.status', query.status] }] : [])
                                        ]
                                    }
                                }
                            },
                            -1
                        ]
                    }
                }
            },
            {
                $unwind: {
                    path: '$lastStatusInPhaseHistory'
                }
            }
        )
        // //mục đích là không phải lấy trường này mà là để lấy thêm thời gian nộp đề tài
        pipelineSub.push({
            $addFields: {
                submittedPhaseHistory: {
                    $arrayElemAt: [
                        {
                            $filter: {
                                input: '$phaseHistories',
                                as: 'ph',
                                cond: { $eq: ['$$ph.status', 'submitted'] }
                            }
                        },
                        0
                    ]
                }
            }
        })
        pipelineSub.push({
            $project: {
                titleEng: 1,
                titleVN: 1,
                description: 1,
                type: 1,
                status: 1,
                createBy: 1,
                createByInfo: '$createByInfo',
                deadline: 1,
                maxStudents: 1,
                createdAt: 1,
                updatedAt: 1,
                periodId: 1,
                currentStatus: 1,
                currentPhase: 1,
                registrationStatus: 1,
                isSaved: 1,
                major: 1,
                lecturers: 1,
                lecturerIds: {
                    $map: {
                        input: '$lecturers',
                        as: 'lecturer',
                        in: '$$lecturer._id'
                    }
                },
                studentsNum: { $size: { $ifNull: ['$studentRef', []] } },
                fields: `$fields`,
                requirements: `$requirements`,
                fieldIds: 1,
                fileIds: 1,
                requirementIds: 1,
                grade: 1,
                isEditable: 1,
                allowManualApproval: 1,
                lastStatusInPhaseHistory: 1,
                //nếu là pha nộp đề tài thì lấy thêm thời gian nộp đề tài
                //Không thì thôi vì phải plainToInstance
                submittedAt: '$submittedPhaseHistory.createdAt',
                periodInfo: 1
            }
        })
        //Phân trang phụ
        //rule 99 nghĩa là phân trang để lọc với các trường cụ thể/ đặc thù
        if (query.rulesPagination === 99) {
            if (query.lecturerIds) {
                pipelineSub.push({
                    $match: {
                        ...{
                            ...(query.lecturerIds
                                ? {
                                      lecturerIds: {
                                          $in: query.lecturerIds.map((id) => new mongoose.Types.ObjectId(id))
                                      }
                                  }
                                : {})
                        },
                        ...{
                            ...(query.fieldIds
                                ? {
                                      fieldIds: {
                                          $in: query.fieldIds.map((id) => new mongoose.Types.ObjectId(id))
                                      }
                                  }
                                : {})
                        },
                        ...{
                            ...(query.queryStatus
                                ? {
                                      currentStatus: {
                                          $in: query.queryStatus
                                      }
                                  }
                                : {})
                        }
                    }
                })
            }
        }
        //if (query.rulesPagination === 0)
        //Nếu là phân trang bình thường
        console.log('ownerId', ownerId)
        pipelineSub.push({
            $match: {
                deleted_at: null,
                periodId: new mongoose.Types.ObjectId(periodId)
            }
        })
        if (ownerId) {
            pipelineSub.push({
                $match: {
                    $expr: {
                        $in: [new mongoose.Types.ObjectId(ownerId), '$lecturerIds']
                    }
                }
            })
        }
        return await this.paginationProvider.paginateQuery<Topic>(query, this.topicRepository, pipelineSub)
    }

    async getTopicsInLibrary(query: RequestGetTopicsInAdvanceSearchParams): Promise<Paginated<Topic>> {
        const { lecturerIds, fieldIds, majorIds, year } = query
        console.log('query', query)
        const pipelineSub: any = []
        pipelineSub.push(...this.getTopicInfoPipelineAbstract())
        pipelineSub.push(...this.buildStudentPipeline(StudentRegistrationStatus.APPROVED))
        pipelineSub.push({
            $project: {
                titleEng: 1,
                titleVN: 1,
                description: 1,
                type: 1,
                status: 1,
                createBy: 1,
                createByInfo: '$createByInfo',
                deadline: 1,
                maxStudents: 1,
                createdAt: 1,
                updatedAt: 1,
                periodId: 1,
                currentStatus: 1,
                currentPhase: 1,
                registrationStatus: 1,
                isSaved: 1,
                major: 1,
                studentsRegistered: 1,
                lecturers: 1,
                lecturerIds: {
                    $map: {
                        input: '$lecturers',
                        as: 'lecturer',
                        in: '$$lecturer._id'
                    }
                },
                studentsNum: { $size: { $ifNull: ['$studentRef', []] } },
                fields: `$fields`,
                requirements: `$requirements`,
                fieldIds: 1,
                fileIds: 1,
                requirementIds: 1,
                grade: 1,
                isEditable: 1,
                allowManualApproval: 1,
                // lastStatusInPhaseHistory: 1,
                //nếu là pha nộp đề tài thì lấy thêm thời gian nộp đề tài
                //Không thì thôi vì phải plainToInstance
                submittedAt: '$submittedPhaseHistory.createdAt',
                periodInfo: 1,
                //lấy năm báo cáo
                year: { $year: '$defenseResult.defenseDate' },
                stats: 1,
                defenseDate: '$defenseResult.defenseDate',
                defenseResult: 1
            }
        })
        //Phân trang phụ
        //rule 99 nghĩa là phân trang để lọc với các trường cụ thể/ đặc thù
        if (query.rulesPagination === 99) {
            if (query.lecturerIds) {
                pipelineSub.push({
                    $match: {
                        ...{
                            ...(query.lecturerIds
                                ? {
                                      lecturerIds: {
                                          $in: query.lecturerIds.map((id) => new mongoose.Types.ObjectId(id))
                                      }
                                  }
                                : {})
                        },
                        ...{
                            ...(query.fieldIds
                                ? {
                                      fieldIds: {
                                          $in: query.fieldIds.map((id) => new mongoose.Types.ObjectId(id))
                                      }
                                  }
                                : {})
                        },
                        ...{
                            ...(query.queryStatus
                                ? {
                                      currentStatus: {
                                          $in: query.queryStatus
                                      }
                                  }
                                : {})
                        }
                    }
                })
            }
        }
        //Nếu là lọc theo năm bảo vệ
        if (year) {
            pipelineSub.push({
                $match: {
                    year: Number(year)
                }
            })
        }

        //Lọc theo chuyên ngành
        if (majorIds) {
            if (Array.isArray(majorIds)) {
                if (majorIds.length > 0)
                    pipelineSub.push({
                        $match: {
                            'major._id': {
                                $in: majorIds.map((id) => new mongoose.Types.ObjectId(id))
                            }
                        }
                    })
            } else
                pipelineSub.push({
                    $match: {
                        'major._id': {
                            $eq: new mongoose.Types.ObjectId(majorIds)
                        }
                    }
                })
        }

        //if (query.rulesPagination === 0)
        pipelineSub.push({
            $match: {
                currentStatus: TopicStatus.Archived,
                deleted_at: null
            }
        })
        console.log('pipelineSub', pipelineSub)
        return await this.paginationProvider.paginateQuery<Topic>(query, this.topicRepository, pipelineSub)
    }

    private buildStudentPipeline(status: StudentRegistrationStatus) {
        return [
            {
                $addFields: {
                    studentRef: {
                        $map: {
                            input: '$studentRef',
                            as: 'studentReg',
                            in: {
                                $cond: [{ $eq: ['$$studentReg.status', status] }, '$$studentReg', null]
                            }
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'studentRef.userId',
                    foreignField: '_id',
                    as: 'userInfos'
                }
            },
            {
                $lookup: {
                    from: 'students',
                    localField: 'studentRef.userId',
                    foreignField: 'userId',
                    as: 'studentInfos'
                }
            },
            {
                $addFields: {
                    studentsRegistered: {
                        $map: {
                            input: '$userInfos',
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
                    }
                }
            }
        ]
    }
    async getRegisteringTopics(
        periodId: string,
        query: RequestGetTopicsInAdvanceSearchParams
    ): Promise<Paginated<Topic>> {
        const pipelineSub: any = []
        pipelineSub.push(...this.getTopicInfoPipelineAbstract())
        //mục đích là không phải lấy trường này mà là để lấy thêm thời gian nộp đề tài
        pipelineSub.push({
            $addFields: {
                submittedPhaseHistory: {
                    $arrayElemAt: [
                        {
                            $filter: {
                                input: '$phaseHistories',
                                as: 'ph',
                                cond: { $eq: ['$$ph.status', 'submitted'] }
                            }
                        },
                        0
                    ]
                }
            }
        })
        pipelineSub.push({
            $project: {
                titleEng: 1,
                titleVN: 1,
                description: 1,
                type: 1,
                status: 1,
                createBy: 1,
                createByInfo: '$createByInfo',
                deadline: 1,
                maxStudents: 1,
                createdAt: 1,
                updatedAt: 1,
                periodId: 1,
                currentStatus: 1,
                currentPhase: 1,
                registrationStatus: 1,
                isSaved: 1,
                major: 1,
                lecturers: 1,
                lecturerIds: {
                    $map: {
                        input: '$lecturers',
                        as: 'lecturer',
                        in: '$$lecturer._id'
                    }
                },
                studentsNum: { $size: { $ifNull: ['$studentRef', []] } },
                fields: `$fields`,
                requirements: `$requirements`,
                fieldIds: 1,
                fileIds: 1,
                requirementIds: 1,
                grade: 1,
                isEditable: 1,
                allowManualApproval: 1,
                //lastStatusInPhaseHistory: 1,
                //nếu là pha nộp đề tài thì lấy thêm thời gian nộp đề tài
                //Không thì thôi vì phải plainToInstance
                submittedAt: '$submittedPhaseHistory.createdAt',
                periodInfo: 1
            }
        })
        //Phân trang phụ
        //rule 99 nghĩa là phân trang để lọc với các trường cụ thể/ đặc thù
        if (query.rulesPagination === 99) {
            if (query.lecturerIds) {
                pipelineSub.push({
                    $match: {
                        ...{
                            ...(query.lecturerIds
                                ? {
                                      lecturerIds: {
                                          $in: query.lecturerIds.map((id) => new mongoose.Types.ObjectId(id))
                                      }
                                  }
                                : {})
                        },
                        ...{
                            ...(query.fieldIds
                                ? {
                                      fieldIds: {
                                          $in: query.fieldIds.map((id) => new mongoose.Types.ObjectId(id))
                                      }
                                  }
                                : {})
                        },
                        ...{
                            ...(query.queryStatus
                                ? {
                                      currentStatus: {
                                          $in: query.queryStatus
                                      }
                                  }
                                : {})
                        }
                    }
                })
            }
        }
        pipelineSub.push({
            $match: {
                periodId: new mongoose.Types.ObjectId(periodId),
                currentPhase: PeriodPhaseName.OPEN_REGISTRATION,
                deleted_at: null
            }
        })
        return await this.paginationProvider.paginateQuery<Topic>(query, this.topicRepository, pipelineSub)
    }
    // lấy thống kê
    async getStatisticInSubmitPhase(periodId: string): Promise<GetTopicStatisticInSubmitPhaseDto> {
        const submitPhase = PeriodPhaseName.SUBMIT_TOPIC
        //Kiểm tra kỳ có pha nộp đề tài chưa
        //Lấy các thông số thuộc pha, trong kì
        // Thêm trường lastPhaseHistory là phần tử cuối cùng thỏa điều kiện (là trạng thái cuối cùng của pha đầu vào) trong phaseHistories
        let pipelineMain: any = []

        pipelineMain.push({
            $facet: {
                rejectedTopics: [
                    {
                        $addFields: {
                            lastStatusInPhaseHistory: {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: '$phaseHistories',
                                            as: 'ph',
                                            cond: { $eq: ['$$ph.phaseName', submitPhase] }
                                        }
                                    },
                                    -1
                                ]
                            }
                        }
                    },
                    {
                        $project: {
                            lastStatusInPhaseHistory: 1,
                            periodId: 1,
                            deleted_at: 1,
                            phaseHistories: 1
                        }
                    },
                    {
                        $match: {
                            periodId: new mongoose.Types.ObjectId(periodId),
                            'lastStatusInPhaseHistory.status': TopicStatus.Rejected,
                            deleted_at: null
                        }
                    },
                    { $count: 'count' }
                ],
                approvedTopics: [
                    {
                        $addFields: {
                            lastStatusInPhaseHistory: {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: '$phaseHistories',
                                            as: 'ph',
                                            cond: { $eq: ['$$ph.phaseName', submitPhase] }
                                        }
                                    },
                                    -1
                                ]
                            }
                        }
                    },

                    {
                        $match: {
                            periodId: new mongoose.Types.ObjectId(periodId),
                            'lastStatusInPhaseHistory.status': TopicStatus.Approved,
                            deleted_at: null
                        }
                    },
                    { $count: 'count' }
                ],
                submittedTopics: [
                    {
                        $addFields: {
                            lastStatusInPhaseHistory: {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: '$phaseHistories',
                                            as: 'ph',
                                            cond: { $eq: ['$$ph.phaseName', submitPhase] }
                                        }
                                    },
                                    -1
                                ]
                            }
                        }
                    },
                    {
                        $match: {
                            periodId: new mongoose.Types.ObjectId(periodId),
                            deleted_at: null,
                            'lastStatusInPhaseHistory.status': TopicStatus.Submitted
                        }
                    },
                    { $count: 'count' }
                ],
                underReviewTopics: [
                    {
                        $match: {
                            periodId: new mongoose.Types.ObjectId(periodId),
                            phaseHistories: {
                                $elemMatch: {
                                    phaseName: submitPhase,
                                    status: TopicStatus.UnderReview
                                }
                            },
                            deleted_at: null
                        }
                    },
                    { $count: 'count' }
                ],
                totalTopicsInPhase: [
                    {
                        $match: {
                            periodId: new mongoose.Types.ObjectId(periodId),
                            'phaseHistories.phaseName': submitPhase,
                            deleted_at: null
                        }
                    },
                    { $count: 'count' }
                ]
            }
        })
        const topicsFigures = await this.topicRepository.aggregate(pipelineMain)
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
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                'lastStatusInPhaseHistory.status': TopicStatus.PendingRegistration,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    registeredTopics: [
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                'lastStatusInPhaseHistory.status': TopicStatus.Registered,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    fullTopics: [
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                'lastStatusInPhaseHistory.status': TopicStatus.Full,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    totalTopicsInPhase: [
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                'phaseHistories.phaseName': currentPhase,
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
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                'lastStatusInPhaseHistory.status': TopicStatus.InProgress,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    delayedTopics: [
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                'lastStatusInPhaseHistory.status': TopicStatus.Delayed,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    pausedTopics: [
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                'lastStatusInPhaseHistory.status': TopicStatus.Paused,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    submittedForReviewTopics: [
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                'lastStatusInPhaseHistory.status': TopicStatus.SubmittedForReview,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    readyForEvaluationNumber: [
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                'lastStatusInPhaseHistory.status': TopicStatus.AwaitingEvaluation,
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
            submittedToReviewTopicsNumber: topicsFigures[0]?.submittedForReviewTopics[0]?.count || 0,
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
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                'lastStatusInPhaseHistory.status': TopicStatus.AwaitingEvaluation,
                                deleted_at: null
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ],
                    gradedTopics: [
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                'lastStatusInPhaseHistory.status': TopicStatus.Graded,
                                deleted_at: null
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ],
                    archivedTopics: [
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                'lastStatusInPhaseHistory.status': TopicStatus.Archived,
                                deleted_at: null
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ],
                    rejectedFinalTopics: [
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                'lastStatusInPhaseHistory.status': TopicStatus.RejectedFinal,
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
        //Lấy các thông số thuộc pha, trong kì
        const topicsFigures = await this.topicRepository.aggregate([
            {
                $facet: {
                    rejectedTopics: [
                        {
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', submitPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                'lastStatusInPhaseHistory.status': TopicStatus.Rejected,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    approvedTopics: [
                        {
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', submitPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                'lastStatusInPhaseHistory.status': TopicStatus.Approved,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    submittedTopics: [
                        {
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', submitPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                'lastStatusInPhaseHistory.status': TopicStatus.Submitted,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    underReviewTopics: [
                        {
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', submitPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                'lastStatusInPhaseHistory.status': TopicStatus.UnderReview,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    totalTopicsInPhase: [
                        {
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                phaseHistories: { $elemMatch: { phaseName: submitPhase } },
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
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                //đang mở đăng ký
                                //vì nếu cso đăng ký thì trạng thái sẽ là registered
                                'lastStatusInPhaseHistory.status': TopicStatus.PendingRegistration,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    registeredTopics: [
                        {
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                'lastStatusInPhaseHistory.status': TopicStatus.Registered,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    fullTopics: [
                        {
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                'lastStatusInPhaseHistory.status': TopicStatus.Full,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    totalTopicsInPhase: [
                        {
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                phaseHistories: { $elemMatch: { phaseName: currentPhase } },
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
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                'lastStatusInPhaseHistory.status': TopicStatus.Cancelled,
                                deleted_at: null
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ],
                    inNormalProcessing: [
                        {
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                'lastStatusInPhaseHistory.status': TopicStatus.InProgress,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    delayedTopics: [
                        {
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                'lastStatusInPhaseHistory.status': TopicStatus.Delayed,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    pausedTopics: [
                        {
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                'lastStatusInPhaseHistory.status': TopicStatus.Paused,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    submittedForReviewTopics: [
                        {
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                'lastStatusInPhaseHistory.status': TopicStatus.SubmittedForReview,
                                isMainSupervisor: true,
                                deleted_at: null
                            }
                        },
                        { $count: 'count' }
                    ],
                    readyForEvaluationNumber: [
                        {
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                'lastStatusInPhaseHistory.status': TopicStatus.AwaitingEvaluation,
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
            submittedToReviewTopicsNumber: topicsFigures[0]?.submittedForReviewTopics[0]?.count || 0,
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
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                'lastStatusInPhaseHistory.status': TopicStatus.AwaitingEvaluation,
                                deleted_at: null
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ],
                    gradedTopics: [
                        {
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                'lastStatusInPhaseHistory.status': TopicStatus.AwaitingEvaluation,
                                deleted_at: null
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ],
                    archivedTopics: [
                        {
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                'lastStatusInPhaseHistory.status': TopicStatus.Archived,
                                deleted_at: null
                            }
                        },
                        {
                            $count: 'count'
                        }
                    ],
                    rejectedFinalTopics: [
                        {
                            $lookup: {
                                //tìm những topic mà người này là hướng dẫn chính
                                from: 'ref_lecturers_topics',
                                let: { topicId: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$userId', new mongoose.Types.ObjectId(lecturerId)] },
                                                    { $eq: ['$topicId', '$$topicId'] },
                                                    { $eq: ['$role', LecturerRoleEnum.MAIN_SUPERVISOR] },
                                                    { $eq: ['$deleted_at', null] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: 'lecTopicRefs'
                            }
                        },
                        //Thêm cờ để đánh dấu đề tài này là của giảng viên đương nhiệm
                        {
                            $addFields: {
                                isMainSupervisor: {
                                    $gt: [{ $size: '$lecTopicRefs' }, 0]
                                }
                            }
                        },
                        {
                            $addFields: {
                                lastStatusInPhaseHistory: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$phaseHistories',
                                                as: 'ph',
                                                cond: { $eq: ['$$ph.phaseName', currentPhase] }
                                            }
                                        },
                                        -1
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                periodId: new mongoose.Types.ObjectId(periodId),
                                isMainSupervisor: true,
                                'lastStatusInPhaseHistory.status': TopicStatus.RejectedFinal,
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
    async storedFilesIn4ToTopic(topicId: string, fileIds: string[]): Promise<GetUploadedFileDto[]> {
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
            return await this.getDocumentsOfTopic(topicId)
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
    async findDraftTopicsByLecturerId(lecturerId: string, query: PaginationQueryDto): Promise<Paginated<Topic>> {
        const pipelineSub: any = []
        pipelineSub.push(...this.getTopicInfoPipelineAbstract())
        pipelineSub.push({
            $match: {
                createBy: new mongoose.Types.ObjectId(lecturerId),
                currentStatus: TopicStatus.Draft,
                deleted_at: null
            }
        })
        return await this.paginationProvider.paginateQuery<Topic>(query, this.topicRepository, pipelineSub)
    }
    async findSubmittedTopicsByLecturerId(
        lecturerId: string,
        query: SubmittedTopicParamsDto
    ): Promise<Paginated<Topic>> {
        const pipelineSub: any = []
        console.log('Finding submitted topics for lecturer ID:', lecturerId, 'with query:', query)
        pipelineSub.push(...this.getTopicInfoPipelineAbstract())
        pipelineSub.push(...this.pipelineSubmittedTopics())
        pipelineSub.push({
            $match: {
                ...(query.periodId ? { periodId: new mongoose.Types.ObjectId(query.periodId) } : {}),
                createBy: new mongoose.Types.ObjectId(lecturerId),
                currentStatus: { $ne: TopicStatus.Draft },
                deleted_at: null
            }
        })

        return await this.paginationProvider.paginateQuery<Topic>(query, this.topicRepository, pipelineSub)
    }
    private pipelineSubmittedTopics() {
        const pipelineSub: any = []

        pipelineSub.push(
            ...[
                {
                    $lookup: {
                        from: 'periods',
                        localField: 'periodId',
                        foreignField: '_id',
                        as: 'periodInfo'
                    }
                },
                {
                    $unwind: { path: '$periodInfo' }
                }
            ]
        )
        pipelineSub.push({
            $addFields: {
                submittedPhaseHistory: {
                    $arrayElemAt: [
                        {
                            $filter: {
                                input: '$phaseHistories',
                                as: 'ph',
                                cond: { $eq: ['$$ph.status', 'submitted'] }
                            }
                        },
                        0
                    ]
                }
            }
        })
        pipelineSub.push({
            $project: {
                _id: 1,
                titleEng: 1,
                titleVN: 1,
                description: 1,
                type: 1,
                status: 1,
                createBy: 1,
                createByInfo: '$createByInfo',
                deadline: 1,
                maxStudents: 1,
                createdAt: 1,
                updatedAt: 1,
                currentStatus: 1,
                currentPhase: 1,
                registrationStatus: 1,
                isSaved: 1,
                major: '$majorsInfo',
                lecturers: 1,
                students: 1,
                fields: `$fields`,
                requirements: `$requirements`,
                fieldIds: 1,
                requirementIds: 1,
                periodId: 1,
                submittedAt: '$submittedPhaseHistory.createdAt',
                periodInfo: 1,
                studentsNum: 1,
                allowManualApproval: 1
            }
        })
        return pipelineSub
    }
    async getSubmittedTopicsNumber(lecturerId: string): Promise<number> {
        return await this.topicRepository.countDocuments({
            createBy: new mongoose.Types.ObjectId(lecturerId),
            currentStatus: TopicStatus.Submitted,
            deleted_at: null
        })
    }
    async copyToDraft(topicId: string, actorId: string): Promise<string> {
        const topic = await this.topicRepository.findOne({ _id: topicId, deleted_at: null }).lean()
        if (!topic) {
            throw new BadRequestException('Đề tài không tồn tại hoặc đã bị xóa')
        }
        // Tìm các bản nháp trùng tên
        const baseTitleVN = topic.titleVN + ' (Bản nháp)'
        const baseTitleEng = topic.titleEng + ' (Draft)'
        let titleVN = baseTitleVN
        let titleEng = baseTitleEng
        let count = 1

        while (await this.topicRepository.findOne({ titleVN })) {
            count++
            titleVN = `${baseTitleVN} ${count}`
        }
        while (await this.topicRepository.findOne({ titleEng })) {
            titleEng = `${baseTitleEng} ${count}`
        }
        const { _id, phaseHistories, periodId, ...topicData } = topic
        const newTopic = {
            ...topicData,
            titleVN: titleVN,
            titleEng: titleEng,
            createBy: new mongoose.Types.ObjectId(actorId),
            currentStatus: TopicStatus.Draft,
            currentPhase: PeriodPhaseName.EMPTY,
            createAt: new Date(),
            updatedAt: new Date()
        }
        let res
        try {
            res = await this.topicRepository.create(newTopic)
        } catch (error) {
            console.error('Error copying topic to draft:', error)
            throw new BadRequestException('Không thể sao chép đề tài')
        }
        return res._id.toString()
    }
    async getMajorsOfTopicInLibrary() {
        // : Promise<GetMiniMiniMajorDto[]>
        let pipelineSub: any[] = []
        pipelineSub.push(
            {
                $lookup: {
                    from: 'majors',
                    localField: 'majorId',
                    foreignField: '_id',
                    as: 'majorsInfo'
                }
            },
            {
                $unwind: {
                    path: '$majorsInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'faculties',
                    localField: 'majorsInfo.facultyId',
                    foreignField: '_id',
                    as: 'facultyInfo'
                }
            },
            {
                $unwind: {
                    path: '$facultyInfo',
                    preserveNullAndEmptyArrays: true
                }
            }
        )
        //lọc các topic có trạng thái là status
        pipelineSub.push({
            $match: {
                currentStatus: TopicStatus.Archived,
                deleted_at: null
            }
        })
        //group
        pipelineSub.push({
            $group: {
                _id: '$majorId',
                name: { $first: '$majorsInfo.name' },
                facultyName: { $first: '$facultyInfo.name' },
                count: { $sum: 1 }
            }
        })
        const results = await this.topicRepository.aggregate(pipelineSub)
        return results
    }
    async getYearsOfTopicInLibrary(): Promise<string[]> {
        const pipelineSub: any[] = []
        pipelineSub.push({
            $match: {
                currentStatus: TopicStatus.Archived,
                deleted_at: null
            }
        })
        pipelineSub.push({
            $addFields: {
                year: { $year: '$defenseResult.defenseDate' }
            }
        })
        pipelineSub.push({
            $group: {
                _id: '$year'
            }
        })
        pipelineSub.push({
            $sort: { _id: 1 }
        })
        const res = await this.topicRepository.aggregate(pipelineSub)
        return res.map((item) => item._id).filter((year) => year != null)
    }
    async getDocumentsOfTopic(topicId: string): Promise<GetUploadedFileDto[]> {
        const res = await this.topicRepository.aggregate([
            {
                $lookup: {
                    from: 'files',
                    localField: 'fileIds',
                    foreignField: '_id',
                    as: 'filesInfo'
                }
            },

            {
                $lookup: {
                    from: 'users',
                    localField: 'filesInfo.actorId',
                    foreignField: '_id',
                    as: 'actorInfo'
                }
            },
            {
                $addFields: {
                    filesInfo: {
                        $map: {
                            input: '$filesInfo',
                            as: 'file',
                            in: {
                                $mergeObjects: [
                                    {
                                        actor: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: '$actorInfo',
                                                        as: 'actor',
                                                        cond: { $eq: ['$$actor._id', '$$file.actorId'] }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    },
                                    '$$file',
                                    {
                                        type: {
                                            $cond: [
                                                {
                                                    $regexMatch: { input: '$$file.mimeType', regex: '^application/pdf' }
                                                },
                                                'pdf',
                                                {
                                                    $cond: [
                                                        {
                                                            $regexMatch: {
                                                                input: '$$file.mimeType',
                                                                regex: 'word|document'
                                                            }
                                                        },
                                                        'doc',
                                                        {
                                                            $cond: [
                                                                {
                                                                    $regexMatch: {
                                                                        input: '$$file.mimeType',
                                                                        regex: '^image/'
                                                                    }
                                                                },
                                                                'image',
                                                                'other'
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    filesInfo: 1
                }
            },
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(topicId),
                    deleted_at: null
                }
            }
        ])
        if (res.length > 0) return res[0].filesInfo
        return res
    }
}
