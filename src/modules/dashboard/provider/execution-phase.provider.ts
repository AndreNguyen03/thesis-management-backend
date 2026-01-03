import { Inject, Injectable } from '@nestjs/common'
import { Topic } from '../../topics/schemas/topic.schemas'
import mongoose, { Model } from 'mongoose'
import { StudentRegisterTopic } from '../../registrations/schemas/ref_students_topics.schemas'
import { LecturerRegisterTopic } from '../../registrations/schemas/ref_lecturers_topics.schemas'
import { InjectModel } from '@nestjs/mongoose'
import { StudentRegistrationStatus } from '../../registrations/enum/student-registration-status.enum'

@Injectable()
export class ExecutionPhaseProvider {
    constructor(
        @InjectModel(Topic.name)
        private readonly topicModel: Model<Topic>,
        @InjectModel(StudentRegisterTopic.name)
        private readonly studentRegTopicModel: Model<StudentRegisterTopic>,
        @InjectModel(LecturerRegisterTopic.name)
        private readonly lecturerRegTopicModel: Model<LecturerRegisterTopic>
    ) {}

    async getLecturerDashboard(periodId: string, lecturerId: string) {
        const pipeline: any[] = []

        // 1. Match các trường filter cơ bản
        const match: any = {}
        match.periodId = new mongoose.Types.ObjectId(periodId)
        match.createBy = new mongoose.Types.ObjectId(lecturerId)
        // Chỉ lấy pha 'open_registration'
        match['phaseHistories.phaseName'] = 'execution'

        pipeline.push({ $match: match })

        // 6. Chọn các trường trả về
        pipeline.push({
            $project: {
                _id: 1,
                titleVN: 1,
                type: 1,
                maxStudents: 1,
                deleted_at: 1
            }
        })

        return this.topicModel.aggregate(pipeline).exec()
    }

    async getStudentDashboard(periodId: string, studentId: string) {
        const studentObjId = new mongoose.Types.ObjectId(studentId)
        const periodObjId = new mongoose.Types.ObjectId(periodId)

        let pipeline: any[] = [
            {
                $match: {
                    periodId: periodObjId,
                    currentStatus: { $ne: 'draft' },
                    deleted_at: null
                }
            },
            {
                $lookup: {
                    from: 'ref_students_topics',
                    let: { topicId: '$_id' }, // Reference topic _id
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$topicId', '$$topicId'] }, // Match topic
                                        { $eq: ['$userId', studentObjId] },
                                        { $in: ['$status', [StudentRegistrationStatus.APPROVED]] }
                                    ]
                                }
                            }
                        },
                        // Project chỉ fields cần cho dashboard
                        {
                            $project: {
                                status: 1,
                                studentNote: 1,
                                lecturerResponse: 1,
                                rejectionReasonType: 1,
                                studentRole: 1,
                                processedBy: 1,
                                updatedAt: 1,
                                createdAt: 1
                            }
                        },
                        { $sort: { created_at: -1 } },
                        { $limit: 1 } // Chỉ lấy 1 registration mới nhất per topic (nếu multiple)
                    ],
                    as: 'studentRegistration'
                }
            },
            // Stage 3: Unwind để filter chỉ topics có registration (bỏ topics chưa đăng ký)
            {
                $unwind: {
                    path: '$studentRegistration',
                    preserveNullAndEmptyArrays: false // Filter out nếu không có registration
                }
            },
            {
                $lookup: {
                    from: 'users',
                    let: { userId: '$createBy' },
                    pipeline: [
                        // 1. Match đúng user tạo topic
                        {
                            $match: {
                                $expr: {
                                    $and: [{ $eq: ['$_id', '$$userId'] }]
                                }
                            }
                        },

                        // 2. Lookup sang lecturers để lấy title
                        {
                            $lookup: {
                                from: 'lecturers',
                                let: { uid: '$_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: { $eq: ['$userId', '$$uid'] }
                                        }
                                    },
                                    {
                                        $project: {
                                            title: 1,
                                            _id: 0
                                        }
                                    }
                                ],
                                as: 'profile'
                            }
                        },

                        // 3. Unwind profile (1–1)
                        {
                            $unwind: {
                                path: '$profile',
                                preserveNullAndEmptyArrays: true
                            }
                        },

                        // 4. Chỉ trả field cần
                        {
                            $project: {
                                _id: 1,
                                fullName: 1,
                                email: 1,
                                avatarUrl: 1,
                                title: '$profile.title'
                            }
                        }
                    ],
                    as: 'lecturer'
                }
            },
            {
                $unwind: {
                    path: '$lecturer',
                    preserveNullAndEmptyArrays: true // Giữ nếu không có lecturer (edge case)
                }
            },
            {
                $project: {
                    _id: 1,
                    titleVN: 1,
                    type: 1,
                    defenseResult: 1,
                    isPublishedToLibrary: 1,
                    lecturer: 1,
                    studentRegistration: 1
                }
            }
        ]
        const result = this.topicModel.aggregate(pipeline).exec()
        console.log('result :::', result)

        return result
    }
}
