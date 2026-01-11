import mongoose, { Model, Types } from 'mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { RequestGetTopicsInAdvanceSearchParams, RequestGetTopicsInPhaseParams } from '../../../topics/dtos'
import { TopicVector } from '../../schemas/topic-vector.schemas'
import { TopicVectorRepositoryInterface } from '../topic-vector.repository.interface'
import { PeriodPhaseName } from '../../../periods/enums/period-phases.enum'
import { TopicStatus } from '../../../topics/enum'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { CandidateTopicDto } from '../../../topics/dtos/candidate-topic.dto'
import { StudentRegistrationStatus } from '../../../registrations/enum/student-registration-status.enum'

@Injectable()
export class TopicVectorRepository
    extends BaseRepositoryAbstract<TopicVector>
    implements TopicVectorRepositoryInterface
{
    constructor(
        @InjectModel(TopicVector.name)
        private readonly topicVectorModel: Model<TopicVector>,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(topicVectorModel)
    }

    async semanticSearchRegisteringTopics(
        queryVector: number[],
        query: RequestGetTopicsInAdvanceSearchParams,
        periodId?: string
    ): Promise<Paginated<TopicVector>> {
        const pipelineSub: any[] = []
        pipelineSub.push(...this.getTopicInfoPipelineAbstract())
        if (queryVector.length > 0) {
            pipelineSub.push(
                {
                    $vectorSearch: {
                        index: 'search_topic_vector_index',
                        path: 'embedding',
                        queryVector: queryVector,
                        // exact: true,
                        numCandidates: 100,
                        limit: 50,
                        filter: {
                            'periodInfo._id': periodId,
                            currentPhase: PeriodPhaseName.OPEN_REGISTRATION,
                            currentStatus: {
                                $in: [TopicStatus.PendingRegistration, TopicStatus.Registered, TopicStatus.Full]
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        score: { $meta: 'vectorSearchScore' }
                    }
                },
                {
                    $match: {
                        score: { $gt: 0.7 }
                    }
                }
            )
        }
        //dùng cho filter theo giảng viên
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

        return await this.paginationProvider.paginateQuery<TopicVector>(query, this.topicVectorModel, pipelineSub)
    }

    async semanticSearchTopicsInLibrary(
        queryVector: number[],
        query: RequestGetTopicsInAdvanceSearchParams
    ): Promise<Paginated<TopicVector>> {
        const pipelineSub: any[] = []
        if (queryVector.length > 0) {
            pipelineSub.push(
                {
                    $vectorSearch: {
                        index: 'search_topic_vector_index',
                        path: 'embedding',
                        queryVector: queryVector,
                        // exact: true,
                        numCandidates: 100,
                        limit: 50,
                        filter: {
                            'lastStatusInPhaseHistory.phaseName': PeriodPhaseName.COMPLETION,
                            'lastStatusInPhaseHistory.status': TopicStatus.Archived
                        }
                    }
                },
                {
                    $addFields: {
                        score: {
                            $round: [{ $meta: 'vectorSearchScore' }, 2]
                        }
                    }
                },
                {
                    $match: {
                        score: { $gt: 0.7 }
                    }
                }
            )
        }

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
        pipelineSub.push({
            $project: {
                embedding: 0,
                text_content: 0,
                lastStatusInPhaseHistory: 0,
                _id: 0
            }
        })

        return await this.paginationProvider.paginateQuery<TopicVector>(query, this.topicVectorModel, pipelineSub)
    }

    async getPendingRegistrationTopics(periodId: string): Promise<CandidateTopicDto[]> {
        const pipeline = [
            {
                $lookup: {
                    from: 'ref_students_topics',
                    let: {
                        originalId: {
                            $toObjectId: '$original_id'
                        }
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$topicId', '$$originalId']
                                }
                            }
                        }
                    ],
                    as: 'studentRef'
                }
            },
            {
                $addFields: {
                    approvedStudentsNum: {
                        $size: {
                            $filter: {
                                input: '$studentRef',
                                as: 'studentRegistration',
                                cond: {
                                    $eq: ['$$studentRegistration.status', StudentRegistrationStatus.APPROVED]
                                }
                            }
                        }
                    }
                }
            },
            {
                $unwind: {
                    path: '$studentRef',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: {
                    'periodInfo._id': periodId,
                    deleted_at: null
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'createByInfo._id',
                    foreignField: '_id',
                    as: 'creator'
                }
            },
            {
                $unwind: {
                    path: '$creator',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    titleVN: 1,
                    titleEng: 1,
                    description: 1,
                    type: 1,
                    majorId: '$major._id',
                    maxStudents: 1,
                    currentStatus: 1,
                    currentPhase: 1,
                    allowManualApproval: 1,
                    areaInterest: '$creator.areaInterest',
                    researchInterests: '$creator.researchInterests',
                    createByInfo: 1,
                    embedding: 1,
                    approvedStudentsNum: 1,
                    fields: 1,
                    requirements: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]

        const result = await this.topicVectorModel.aggregate(pipeline).exec()
        return result
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
                finalProduct: 1,
                registrationStatus: { $arrayElemAt: [{ $ifNull: ['$studentRef.status', []] }, 0] }
            }
        })
        return pipeline
    }
}
