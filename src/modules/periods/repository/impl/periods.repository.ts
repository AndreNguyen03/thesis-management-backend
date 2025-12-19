import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Period, PeriodPhase } from '../../schemas/period.schemas'
import { IPeriodRepository } from '../periods.repository.interface'
import mongoose, { Model, now, Types } from 'mongoose'
import { RequestGetPeriodsDto } from '../../dtos/request-get-all.dto'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { BadRequestException, NotFoundException, RequestTimeoutException } from '@nestjs/common'
import { plainToClass, plainToInstance } from 'class-transformer'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'
import { PeriodStatus } from '../../enums/periods.enum'
import { PeriodPhaseName } from '../../enums/period-phases.enum'
import { ConfigPhaseSubmitTopicDto } from '../../dtos/period-phases.dtos'
import { PeriodDetail } from '../../dtos/phase-resolve.dto'
import { GetCurrentPeriod, GetPeriodDto } from '../../dtos/period.dtos'
import { $ } from '@faker-js/faker/dist/airline-CLphikKp'
import { start } from 'repl'
import { th } from '@faker-js/faker/.'
import { UserRole } from '../../../../auth/enum/user-role.enum'
import { User } from '../../../../users/schemas/users.schema'
import { pipe } from 'rxjs'
import { from } from 'form-data'
import path from 'path'

export class PeriodRepository extends BaseRepositoryAbstract<Period> implements IPeriodRepository {
    constructor(
        @InjectModel(Period.name) private readonly periodModel: Model<Period>,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(periodModel)
    }

    async configPhaseInPeriod(updatedPhase: PeriodPhase, periodId: string): Promise<boolean> {
        try {
            const res = await this.periodModel.findOneAndUpdate({
                _id: new mongoose.Types.ObjectId(periodId),
                deleted_at: null
            })
            if (!res) {
                throw new BadRequestException('Không tìm thấy kỳ để thêm giai đoạn')
            }
            res.currentPhase = updatedPhase.phase
            res.phases = res.phases.map((phase) => {
                if (phase.phase === updatedPhase.phase) {
                    return { ...phase, ...updatedPhase }
                }
                return phase
            })
            await res.save()
            return true
        } catch (error) {
            console.log('Error in createPhaseInPeriod:', error)
            throw new RequestTimeoutException()
        }
    }
    async getAllPeriods(facultyId: string, query: RequestGetPeriodsDto): Promise<Paginated<Period>> {
        let pipelineSub: any[] = []
        //Tìm kiếm những period trong khoa
        pipelineSub.push(
            {
                $addFields: {
                    status: {
                        $switch: {
                            branches: [
                                {
                                    case: { $or: [{ $not: '$startTime' }, { $not: '$endTime' }] },
                                    then: 'pending'
                                },
                                {
                                    case: { $lt: ['$$NOW', '$startTime'] },
                                    then: 'pending'
                                },
                                {
                                    case: {
                                        $and: [{ $gte: ['$$NOW', '$startTime'] }, { $lte: ['$$NOW', '$endTime'] }]
                                    },
                                    then: 'active'
                                },
                                {
                                    case: {
                                        $eq: ['status', PeriodStatus.Completed]
                                    },
                                    then: PeriodStatus.Completed
                                }
                            ],
                            default: 'timeout'
                        }
                    }
                }
            },
            {
                $addFields: {
                    phases: {
                        $map: {
                            input: '$phases',
                            as: 'phase',
                            in: {
                                $mergeObjects: [
                                    '$$phase',
                                    {
                                        status: {
                                            $switch: {
                                                branches: [
                                                    {
                                                        case: {
                                                            $or: [
                                                                { $not: '$$phase.startTime' },
                                                                { $not: '$$phase.endTime' }
                                                            ]
                                                        },
                                                        then: 'pending'
                                                    },
                                                    {
                                                        case: { $lt: ['$$NOW', '$$phase.startTime'] },
                                                        then: 'pending'
                                                    },
                                                    {
                                                        case: {
                                                            $and: [
                                                                { $gte: ['$$NOW', '$$phase.startTime'] },
                                                                { $lte: ['$$NOW', '$$phase.endTime'] }
                                                            ]
                                                        },
                                                        then: 'active'
                                                    }
                                                ],
                                                default: 'timeout'
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        )
        pipelineSub.push(
            {
                $addFields: {
                    //lấy ra để kiểm tra để cho phép thực hiện hành động hay không
                    currentPhaseDetail: {
                        $filter: {
                            input: '$phases',
                            as: 'phase',
                            cond: { $eq: ['$$phase.phase', '$currentPhase'] }
                        }
                    }
                }
            },
            {
                $unwind: {
                    path: '$currentPhaseDetail',
                    preserveNullAndEmptyArrays: true
                }
            }
        )
        pipelineSub.push({
            $match: {
                ...(query.type ? { type: query.type } : {}),
                ...(query.status ? { status: query.status } : {})
            }
        })
        pipelineSub.push(
            { $match: { faculty: new mongoose.Types.ObjectId(facultyId), deleted_at: null } },
            { $sort: { startTime: -1 } }
        )
        pipelineSub.push({
            $project: {
                _id: 1,
                year: 1,
                semester: 1,
                type: 1,
                facultyName: '$facultyInfo.name',
                status: 1,
                startTime: 1,
                endTime: 1,
                currentPhase: 1,
                currentPhaseDetail: 1,
                isActiveAction: 1,
                navItem: 1,
                submittedCount: 1
            }
        })
        return this.paginationProvider.paginateQuery<Period>(query, this.periodModel, pipelineSub)
    }
    //xuwr lý admin xem danh sách kỳ hiện tại của khoa
    async getCurrentPeriods(facultyId: string, role: string, userId: string): Promise<GetCurrentPeriod[]> {
        let pipelineSub: any[] = []
        //Tìm kiếm những period trong khoa
        pipelineSub.push(
            {
                $addFields: {
                    status: {
                        $switch: {
                            branches: [
                                {
                                    case: { $or: [{ $not: '$startTime' }, { $not: '$endTime' }] },
                                    then: 'pending'
                                },
                                {
                                    case: { $lt: ['$$NOW', '$startTime'] },
                                    then: 'pending'
                                },
                                {
                                    case: {
                                        $and: [{ $gte: ['$$NOW', '$startTime'] }, { $lte: ['$$NOW', '$endTime'] }]
                                    },
                                    then: 'active'
                                },
                                {
                                    case: {
                                        $eq: ['status', PeriodStatus.Completed]
                                    },
                                    then: PeriodStatus.Completed
                                }
                            ],
                            default: 'timeout'
                        }
                    }
                }
            },
            {
                $addFields: {
                    phases: {
                        $map: {
                            input: '$phases',
                            as: 'phase',
                            in: {
                                $mergeObjects: [
                                    '$$phase',
                                    {
                                        status: {
                                            $switch: {
                                                branches: [
                                                    {
                                                        case: {
                                                            $or: [
                                                                { $not: '$$phase.startTime' },
                                                                { $not: '$$phase.endTime' }
                                                            ]
                                                        },
                                                        then: 'pending'
                                                    },
                                                    {
                                                        case: { $lt: ['$$NOW', '$$phase.startTime'] },
                                                        then: 'pending'
                                                    },
                                                    {
                                                        case: {
                                                            $and: [
                                                                { $gte: ['$$NOW', '$$phase.startTime'] },
                                                                { $lte: ['$$NOW', '$$phase.endTime'] }
                                                            ]
                                                        },
                                                        then: 'active'
                                                    }
                                                ],
                                                default: 'timeout'
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    //lấy ra để kiểm tra để cho phép thực hiện hành động hay không
                    currentPhaseDetail: {
                        $filter: {
                            input: '$phases',
                            as: 'phase',
                            cond: { $eq: ['$$phase.phase', '$currentPhase'] }
                        }
                    }
                }
            },
            {
                $unwind: {
                    path: '$currentPhaseDetail',
                    preserveNullAndEmptyArrays: true
                }
            }
        )
        //Tìm kiếm những period trong khoa
        pipelineSub.push(
            {
                $lookup: {
                    from: 'faculties',
                    localField: 'faculty',
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

        pipelineSub.push(
            { $match: { faculty: new mongoose.Types.ObjectId(facultyId), deleted_at: null } },
            { $sort: { startTime: 1 } }
        )
        switch (role) {
            case UserRole.ADMIN: //coming soon admin xem tất cả các kỳ
                break
            case UserRole.FACULTY_BOARD:
                //giảng viên lấy ra thì phải là những period pending hoặc active hoặc timeout
                //nếu completed thì biến mất
                pipelineSub.push({
                    $match: {
                        status: { $in: ['pending', 'active', 'timeout'] }
                    }
                })
                break
            case UserRole.LECTURER:
                // Lookup số lượng topics đã submit của giảng viên trong period
                pipelineSub.push({
                    $lookup: {
                        from: 'topics',
                        let: { periodId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$periodId', '$$periodId'] },
                                            { $ne: ['$currentStatus', 'draft'] },
                                            { $eq: ['$createBy', new mongoose.Types.ObjectId(userId)] },
                                            { $eq: ['$deleted_at', null] }
                                        ]
                                    }
                                }
                            },
                            {
                                $count: 'count'
                            }
                        ],
                        as: 'submittedTopicsCount'
                    }
                })

                pipelineSub.push({
                    $addFields: {
                        submittedCount: {
                            $ifNull: [{ $arrayElemAt: ['$submittedTopicsCount.count', 0] }, 0]
                        }
                    }
                })

                pipelineSub.push({
                    $addFields: {
                        navItem: {
                            $cond: {
                                if: { $eq: ['$currentPhase', PeriodPhaseName.SUBMIT_TOPIC] },
                                then: {
                                    $let: {
                                        vars: {
                                            submitPhase: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: '$phases',
                                                            as: 'phase',
                                                            cond: {
                                                                $eq: ['$$phase.phase', PeriodPhaseName.SUBMIT_TOPIC]
                                                            }
                                                        }
                                                    },
                                                    0
                                                ]
                                            },

                                            isRequired: {
                                                $gt: [
                                                    {
                                                        $size: {
                                                            $filter: {
                                                                input: '$phases',
                                                                as: 'phase',
                                                                cond: {
                                                                    $and: [
                                                                        {
                                                                            $eq: [
                                                                                '$$phase.phase',
                                                                                PeriodPhaseName.SUBMIT_TOPIC
                                                                            ]
                                                                        },
                                                                        {
                                                                            $in: [
                                                                                new mongoose.Types.ObjectId(userId),
                                                                                '$$phase.requiredLecturerIds'
                                                                            ]
                                                                        }
                                                                    ]
                                                                }
                                                            }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        },
                                        in: {
                                            $cond: {
                                                if: '$$isRequired',
                                                then: {
                                                    $let: {
                                                        vars: {
                                                            minRequired: {
                                                                $ifNull: ['$$submitPhase.minTopicsPerLecturer', 0]
                                                            },
                                                            submitted: '$submittedCount'
                                                        },
                                                        in: {
                                                            $cond: {
                                                                if: {
                                                                    $or: [
                                                                        { $eq: ['$currentPhaseDetail', null] },
                                                                        { $eq: ['$currentPhaseDetail.status', null] }
                                                                    ]
                                                                },
                                                                then: [{
                                                                    title: 'Giai đoạn chưa được cấu hình',
                                                                    url: null,
                                                                    isDisabled: true,
                                                                    badge: {
                                                                        text: 'Chưa config',
                                                                        variant: 'secondary'
                                                                    }
                                                                }],
                                                                else: {
                                                                    $cond: {
                                                                        if: {
                                                                            $eq: [
                                                                                '$currentPhaseDetail.status',
                                                                                'active'
                                                                            ]
                                                                        },
                                                                        then: {
                                                                            $cond: {
                                                                                if: {
                                                                                    $gte: [
                                                                                        '$$submitted',
                                                                                        '$$minRequired'
                                                                                    ]
                                                                                },
                                                                                then: [{
                                                                                    title: 'Đã nộp đủ đề tài',
                                                                                    url: {
                                                                                        $concat: [
                                                                                            '/registration/',
                                                                                            { $toString: '$_id' },
                                                                                            '/submit-topics'
                                                                                        ]
                                                                                    },
                                                                                    isDisabled: false,
                                                                                    badge: {
                                                                                        text: {
                                                                                            $concat: [
                                                                                                '/registration/',
                                                                                                { $toString: '$_id' },
                                                                                                '/submit-topics'
                                                                                            ]
                                                                                        },
                                                                                        isDisabled: false,
                                                                                        badge: {
                                                                                            text: {
                                                                                                $concat: [
                                                                                                    'Số lượng nộp ',
                                                                                                    {
                                                                                                        $toString:
                                                                                                            '$$submitted'
                                                                                                    },
                                                                                                    '/',
                                                                                                    {
                                                                                                        $toString:
                                                                                                            '$$minRequired'
                                                                                                    }
                                                                                                ]
                                                                                            },
                                                                                            variant: 'success'
                                                                                        }
                                                                                    }
                                                                                }],
                                                                                else: [{
                                                                                    title: 'Nộp đề tài',
                                                                                    url: {
                                                                                        $concat: [
                                                                                            '/registration/',
                                                                                            { $toString: '$_id' },
                                                                                            '/submit-topics'
                                                                                        ]
                                                                                    },
                                                                                    isDisabled: false,
                                                                                    badge: {
                                                                                        text: {
                                                                                            $concat: [
                                                                                                '/registration/',
                                                                                                { $toString: '$_id' },
                                                                                                '/submit-topics'
                                                                                            ]
                                                                                        },
                                                                                        isDisabled: false,
                                                                                        badge: {
                                                                                            text: {
                                                                                                $concat: [
                                                                                                    'Đã nộp ',
                                                                                                    {
                                                                                                        $toString:
                                                                                                            '$$submitted'
                                                                                                    },
                                                                                                    '/',
                                                                                                    {
                                                                                                        $toString:
                                                                                                            '$$minRequired'
                                                                                                    }
                                                                                                ]
                                                                                            },
                                                                                            variant: 'warning'
                                                                                        }
                                                                                    }
                                                                                }]
                                                                            }
                                                                        },
                                                                        else: {
                                                                            $cond: {
                                                                                if: {
                                                                                    $eq: [
                                                                                        '$currentPhaseDetail.status',
                                                                                        'pending'
                                                                                    ]
                                                                                },
                                                                                then: [{
                                                                                    title: 'Chưa đến thời gian nộp',
                                                                                    url: null,
                                                                                    isDisabled: true,
                                                                                    badge: {
                                                                                        text: {
                                                                                            $concat: [
                                                                                                'Yêu cầu nộp ',
                                                                                                {
                                                                                                    $toString:
                                                                                                        '$$minRequired'
                                                                                                },
                                                                                                ' đề tài. Hãy chuẩn bị nhé'
                                                                                            ]
                                                                                        },
                                                                                        variant: 'info'
                                                                                    },
                                                                                    note: {
                                                                                        $concat: [
                                                                                            'Yêu cầu nộp ',
                                                                                            {
                                                                                                $toString:
                                                                                                    '$$minRequired'
                                                                                            },
                                                                                            ' đề tài. Hãy chuẩn bị nhé'
                                                                                        ]
                                                                                    }
                                                                                }],
                                                                                else: [{
                                                                                    title: {
                                                                                        $cond: {
                                                                                            if: {
                                                                                                $lt: [
                                                                                                    '$submittedCount',
                                                                                                    '$$minRequired'
                                                                                                ]
                                                                                            },
                                                                                            then: 'Quá hạn nộp',
                                                                                            else: 'Nộp đủ - Đã kết thúc'
                                                                                        }
                                                                                    },
                                                                                    {
                                                                                        title: 'Soạn đề tài',
                                                                                        url: '/manage-topics',
                                                                                        isDisabled: false
                                                                                    }
                                                                                ],
                                                                                else: [
                                                                                    {
                                                                                        title: {
                                                                                            $cond: {
                                                                                                if: {
                                                                                                    $lt: [
                                                                                                        '$submittedCount',
                                                                                                        '$$minRequired'
                                                                                                    ]
                                                                                                },
                                                                                                then: 'Quá hạn nộp',
                                                                                                else: 'Nộp đủ - Đã kết thúc'
                                                                                            }
                                                                                        },
                                                                                        url: {
                                                                                            $concat: [
                                                                                                '/registration/',
                                                                                                { $toString: '$_id' },
                                                                                                '/submit-topics'
                                                                                            ]
                                                                                        },
                                                                                        isDisabled: false,
                                                                                        badge: {
                                                                                            text: 'Thời gian đã hết',
                                                                                            variant: 'danger'
                                                                                        },
                                                                                        note: {
                                                                                            $cond: {
                                                                                                if: {
                                                                                                    $lt: [
                                                                                                        '$submittedCount',
                                                                                                        '$$minRequired'
                                                                                                    ]
                                                                                                },
                                                                                                then: 'Cố gắng hoàn thành',
                                                                                                else: ''
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }]
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                },
                                                else: [{
                                                    title: 'Không được yêu cầu nộp',
                                                    url: null,
                                                    isDisabled: true
                                                }]
                                            }
                                        }
                                    }
                                },
                                else: {
                                    $cond: {
                                        if: { $eq: ['$currentPhase', PeriodPhaseName.OPEN_REGISTRATION] },
                                        then: [{
                                            title: 'Đề tài của bạn đã mở đăng ký',
                                            url: {
                                                $concat: [{ $toString: '$_id' }, '/manage-topics']
                                            },
                                            isDisabled: false
                                        }],
                                        else: []
                                    }
                                }
                            }
                        }
                    }
                })

                //giảng viên lấy ra thì phải là những period pending hoặc active hoặc timeout
                //nếu completed thì biến mất
                pipelineSub.push({
                    $match: {
                        status: { $in: ['pending', 'active', 'timeout'] },
                        currentPhase: { $ne: PeriodPhaseName.EMPTY }
                    }
                })

                break
            case UserRole.FACULTY_BOARD:
                //giảng viên lấy ra thì phải là những period pending hoặc active hoặc timeout
                //nếu completed thì biến mất
                pipelineSub.push({
                    $match: {
                        status: { $in: ['pending', 'active', 'timeout'] },
                        currentPhase: { $ne: PeriodPhaseName.EMPTY }
                    }
                })
                break
            case UserRole.STUDENT:
                pipelineSub.push({
                    $addFields: {
                        navItem: {
                            $cond: {
                                if: { $eq: ['$currentPhaseDetail.status', 'pending'] },
                                then: [{
                                    title: 'Đợt đăng ký đề tài chưa mở',
                                    url: null,
                                    isDisabled: true,
                                    badge: {
                                        text: 'Chưa bắt đầu',
                                        variant: 'default'
                                    }
                                }],
                                else: {
                                    $cond: {
                                        if: { $eq: ['$currentPhaseDetail.status', 'active'] },
                                        then: [{
                                            title: 'Khám phá các đề tài đã mở đăng ký',
                                            url: { $concat: ['/registration/', { $toString: '$_id' }] },
                                            isDisabled: false,
                                            badge: {
                                                text: 'Đang mở',
                                                variant: 'success'
                                            }
                                        }],
                                        else: [{
                                            title: 'Hết hạn đăng ký đề tài',
                                            url: null,
                                            isDisabled: true,
                                            badge: {
                                                text: 'Hết hạn',
                                                variant: 'danger'
                                            }
                                        }]
                                    }
                                }
                            }
                        }
                    }
                })
                //sinh viên lấy ra thì phải lấy những period đang pending hoặc active
                pipelineSub.push({
                    $match: {
                        status: { $in: ['pending', 'active', 'timeout'] },
                        currentPhase: PeriodPhaseName.OPEN_REGISTRATION
                    }
                })

                break
        }
        pipelineSub.push({
            $project: {
                _id: 1,
                year: 1,
                semester: 1,
                type: 1,
                facultyName: '$facultyInfo.name',
                status: 1,
                startTime: 1,
                endTime: 1,
                currentPhase: 1,
                currentPhaseDetail: 1,
                isActiveAction: 1,
                navItem: 1,
                submittedCount: 1
            }
        })

        return await this.periodModel.aggregate(pipelineSub).exec()
    }

    async deletePeriod(periodId: string): Promise<boolean> {
        console.log(periodId)
        const result = await this.periodModel.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(periodId), deleted_at: null } },
            { $project: { startTime: 1, endTime: 1, status: 1, currentPhase: 1 } }
        ])

        if (result.length === 0) {
            throw new BadRequestException('Kỳ không tồn tại hoặc đã bị xóa')
        }
        const now = new Date()
        let status: string
        if (!result[0].startTime || !result[0].endTime) {
            status = 'pending'
        } else if (now < new Date(result[0].startTime)) {
            status = 'pending'
        } else if (now >= new Date(result[0].startTime) && now <= new Date(result[0].endTime)) {
            status = 'active'
        } else if (result[0].status === PeriodStatus.Completed) {
            status = PeriodStatus.Completed
        } else {
            status = 'timeout'
        }
        if (status !== 'pending' && result[0].currentPhase !== PeriodPhaseName.EMPTY) {
            throw new BadRequestException('Kỳ này đã bắt đầu hoặc đã kết thúc, không thể xóa')
        }
        const res = await this.periodModel.updateOne(
            { _id: new mongoose.Types.ObjectId(periodId), deleted_at: null },
            { deleted_at: new Date() }
        )
        return res.modifiedCount > 0
    }

    // }

    async getPeriodInfo(facultyId: string, type: string): Promise<GetPeriodDto> {
        const currentPeriod = await this.periodModel
            .findOne({
                faculty: new mongoose.Types.ObjectId(facultyId),
                status: PeriodStatus.OnGoing,
                type: type,
                currentPhase: { $ne: PeriodPhaseName.EMPTY },
                deleted_at: null
            })
            .sort({ createdAt: -1 })
            .populate('faculty')
            .lean()
        if (!currentPeriod) {
            throw new BadRequestException('Không tìm thấy kỳ hiện tại')
        }
        const { currentPhase, faculty: facultyRes, ...currentPeriodObject } = currentPeriod
        const currentPeriodPhase = currentPeriod.phases.find((phase) => phase.phase === currentPeriod.currentPhase)

        return await plainToInstance(
            GetPeriodDto,
            {
                _id: currentPeriodObject._id.toString(),
                semester: currentPeriodObject.semester,
                year: currentPeriodObject.year,
                type: currentPeriodObject.type,
                faculty: facultyRes,
                phases: currentPeriodObject.phases.map((phase) => ({
                    ...phase,
                    status: (() => {
                        const now = new Date()
                        if (!phase.startTime || !phase.endTime) {
                            return 'pending'
                        }
                        if (now < phase.startTime) {
                            return 'pending'
                        } else if (now >= phase.startTime && now <= phase.endTime) {
                            return 'active'
                        } else {
                            return 'timeout'
                        }
                    })()
                })),
                status: (() => {
                    const now = new Date()
                    if (!currentPeriodObject.startTime || !currentPeriodObject.endTime) {
                        return 'pending'
                    }
                    if (now < currentPeriodObject.startTime) {
                        return 'pending'
                    } else if (now >= currentPeriodObject.startTime && now <= currentPeriodObject.endTime) {
                        return 'active'
                    } else {
                        return 'timeout'
                    }
                })(),
                currentPhase: currentPhase,
                currentPhaseDetail: {
                    ...currentPeriodPhase,
                    status: (() => {
                        const now = new Date()
                        if (!currentPeriodPhase || !currentPeriodPhase.startTime || !currentPeriodPhase.endTime) {
                            return 'pending'
                        }
                        if (now < currentPeriodPhase.startTime) {
                            return 'pending'
                        } else if (now >= currentPeriodPhase.startTime && now <= currentPeriodPhase.endTime) {
                            return 'active'
                        } else {
                            return 'timeout'
                        }
                    })()
                },
                startTime: currentPeriodObject.startTime,
                endTime: currentPeriodObject.endTime
            },
            { excludeExtraneousValues: true, enableImplicitConversion: true }
        )
    }

    async checkCurrentPeriod(periodId: string): Promise<boolean> {
        const currentPeriod = await this.periodModel.findOne({
            _id: new mongoose.Types.ObjectId(periodId),
            status: PeriodStatus.OnGoing,
            currentPhase: { $ne: PeriodPhaseName.EMPTY },
            deleted_at: null
        })
        return currentPeriod ? true : false
    }
    private async AbstractGetPeriodInfo(periodId: string) {
        const pipelineMain: any[] = [
            // Match the period by ID
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(periodId),
                    deleted_at: null
                }
            },
            // Lookup faculty information
            {
                $lookup: {
                    from: 'faculties',
                    localField: 'faculty',
                    foreignField: '_id',
                    as: 'faculty'
                }
            },
            {
                $unwind: {
                    path: '$faculty',
                    preserveNullAndEmptyArrays: true
                }
            },
            // Lookup user information for required lecturers
            {
                $lookup: {
                    from: 'users',
                    localField: 'phases.requiredLecturerIds',
                    foreignField: '_id',
                    as: 'lecUserInfo'
                }
            },
            // Lookup lecturer details
            {
                $lookup: {
                    from: 'lecturers',
                    localField: 'lecUserInfo._id',
                    foreignField: 'userId',
                    as: 'lectInfos'
                }
            },
            // Merge user and lecturer information
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
                                ]
                            }
                        }
                    }
                }
            },
            // Map required lecturers to each phase
            {
                $addFields: {
                    phases: {
                        $map: {
                            input: '$phases',
                            as: 'phase',
                            in: {
                                $mergeObjects: [
                                    '$$phase',
                                    {
                                        requiredLecturers: {
                                            $filter: {
                                                input: '$lecturers',
                                                as: 'lec',
                                                cond: {
                                                    $in: ['$$lec._id', { $ifNull: ['$$phase.requiredLecturerIds', []] }]
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            // Project final fields
            {
                $project: {
                    lecUserInfo: 0,
                    lectInfos: 0,
                    lecturers: 0
                }
            }
        ]

        return pipelineMain
    }

    async getDetailPeriod(periodId: string): Promise<PeriodDetail | null> {
        let pipelineMain: any[] = []
        pipelineMain.push(...(await this.AbstractGetPeriodInfo(periodId)))
        const result = await this.periodModel.aggregate(pipelineMain)
        if (!result || result.length === 0) return null

        const period = result[0]
        const now = new Date()

        period.phases = (period.phases || []).map((phase: any) => {
            let status = 'not_started'
            if (now < new Date(phase.startTime)) {
                status = 'not_started'
            } else if (now >= new Date(phase.startTime) && now <= new Date(phase.endTime)) {
                status = 'ongoing'
            } else if (now > new Date(phase.endTime)) {
                status = 'completed'
            }
            return { ...phase, status }
        })
        return period
    }
    async initalizePhasesForNewPeriod(periodId: string): Promise<Period> {
        const phases: any[] = []
        const patternPhase = plainToClass(PeriodPhase, new ConfigPhaseSubmitTopicDto())
        const newSubmitTopicPhase = { ...patternPhase, phase: PeriodPhaseName.SUBMIT_TOPIC }
        const newOpenRegPhase = { ...patternPhase, phase: PeriodPhaseName.OPEN_REGISTRATION }
        const newExecutionPhase = { ...patternPhase, phase: PeriodPhaseName.EXECUTION }
        const newCompletionPhase = { ...patternPhase, phase: PeriodPhaseName.COMPLETION }
        phases.push(newSubmitTopicPhase, newOpenRegPhase, newExecutionPhase, newCompletionPhase)
        const res = await this.periodModel
            .findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(periodId),
                    deleted_at: null
                },
                { $set: { phases } },
                { new: true }
            )
            .lean()
        if (!res) {
            throw new BadRequestException('Không tìm thấy kỳ để thêm giai đoạn')
        }
        return res
    }
    async createNewPeriod(period: Period): Promise<Period> {
        const periods = await this.periodModel.aggregate([
            {
                $addFields: {
                    status: {
                        $switch: {
                            branches: [
                                {
                                    case: { $or: [{ $not: '$startTime' }, { $not: '$endTime' }] },
                                    then: 'pending'
                                },
                                {
                                    case: { $lt: ['$$NOW', '$startTime'] },
                                    then: 'pending'
                                },
                                {
                                    case: {
                                        $and: [{ $gte: ['$$NOW', '$startTime'] }, { $lte: ['$$NOW', '$endTime'] }]
                                    },
                                    then: 'active'
                                },
                                {
                                    case: { $eq: ['$status', PeriodStatus.Completed] },
                                    then: PeriodStatus.Completed
                                }
                            ],
                            default: 'timeout'
                        }
                    }
                }
            },
            {
                $match: {
                    faculty: period.faculty,
                    type: period.type,
                    status: { $in: ['pending', 'active', 'completed'] },
                    deleted_at: null
                }
            }
        ])
        if (periods.length > 0) {
            throw new BadRequestException('Đã tồn tại kỳ với loại và trạng thái trùng nhau')
        }
        const createdPeriod = new this.periodModel(period)
        const res = await createdPeriod.save()
        return await this.initalizePhasesForNewPeriod(res._id.toString())
    }
    async getPeriodById(periodId: string): Promise<GetPeriodDto> {
        let pipelineMain = await this.AbstractGetPeriodInfo(periodId)
        pipelineMain.push({
            $addFields: {
                phases: {
                    $map: {
                        input: '$phases',
                        as: 'phase',
                        in: {
                            $mergeObjects: [
                                '$$phase',
                                {
                                    status: {
                                        $switch: {
                                            branches: [
                                                {
                                                    case: {
                                                        $or: [
                                                            { $not: '$$phase.startTime' },
                                                            { $not: '$$phase.endTime' }
                                                        ]
                                                    },
                                                    then: 'pending'
                                                },
                                                {
                                                    case: { $lt: ['$$NOW', '$$phase.startTime'] },
                                                    then: 'pending'
                                                },
                                                {
                                                    case: {
                                                        $and: [
                                                            { $gte: ['$$NOW', '$$phase.startTime'] },
                                                            { $lte: ['$$NOW', '$$phase.endTime'] }
                                                        ]
                                                    },
                                                    then: 'active'
                                                }
                                            ],
                                            default: 'timeout'
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        })
        pipelineMain.push(
            {
                $addFields: {
                    //lấy ra để kiểm tra để cho phép thực hiện hành động hay không
                    currentPhaseDetail: {
                        $filter: {
                            input: '$phases',
                            as: 'phase',
                            cond: { $eq: ['$$phase.phase', '$currentPhase'] }
                        }
                    }
                }
            },
            {
                $unwind: {
                    path: '$currentPhaseDetail',
                    preserveNullAndEmptyArrays: true
                }
            }
        )
        const result = await this.periodModel.aggregate(pipelineMain)
        if (!result || result.length === 0) throw new NotFoundException('Không tìm thấy kỳ')

        const period = result[0]
        console.log('period detail:', period)
        return period
    }
}
