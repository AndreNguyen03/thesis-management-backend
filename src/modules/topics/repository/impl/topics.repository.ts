import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { plainToInstance } from 'class-transformer'
import { Topic } from '../../schemas/topic.schemas'
import { CreateTopicDto, GetTopicResponseDto } from '../../dtos'
import { TopicRepositoryInterface } from '../topic.repository.interface'
import mongoose, { Model, mongo } from 'mongoose'

export class TopicRepository extends BaseRepositoryAbstract<Topic> implements TopicRepositoryInterface {
    public constructor(
        @InjectModel(Topic.name)
        private readonly topicRepository: Model<Topic>
        //   @InjectModel(UserSavedTopics.name) private readonly archiveRepository: Model<UserSavedTopics>
    ) {
        super(topicRepository)
    }
    async findSavedTopicsByUserId(userId: string): Promise<GetTopicResponseDto[]> {
        console.log('userId:', userId)
        let pipeline: any[] = []
        pipeline.push(...this.getTopicInfoPipelineAbstract(userId))
        pipeline.push({ $match: { deleted_at: null, isSaved: true } })

        //Lấy ra topic không null và mảng topic người dùng đã lưu khác rỗng
        const topic = await this.topicRepository.aggregate(pipeline)
        return topic
    }
    async getTopicById(topicId: string, userId: string): Promise<GetTopicResponseDto | null> {
        console.log('getTopicByIduserId:', userId)
        
        let pipeline: any[] = []
        pipeline.push(...this.getTopicInfoPipelineAbstract(userId))
        pipeline.push({ $match: { _id: new mongoose.Types.ObjectId(topicId), deleted_at: null } })
        const topic = await this.topicRepository.aggregate(pipeline)
        return topic[0]
    }
    async createTopic(topicData: CreateTopicDto): Promise<GetTopicResponseDto> {
        const createdTopic = (
            await (await this.topicRepository.create(topicData)).populate('majorId', 'name')
        ).populate('createBy', 'fullName')
        return plainToInstance(GetTopicResponseDto, createdTopic, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
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

    private getTopicInfoPipelineAbstract(userId: string) {
        let pipeline: any[] = []
        let embedded_pl: any[] = []
        // lấy thông tin đã lưu liên quan tới cặp {userId,topicId(for each)}
        embedded_pl.push({
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
                pipeline: embedded_pl,
                as: 'savedInfo'
            }
        })
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
            // Join lecturers qua ref_lecturer_topic
            {
                $lookup: {
                    from: 'ref_lecturers_topics',
                    localField: '_id',
                    foreignField: 'topicId',
                    as: 'lecturerRefs'
                }
            },
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
                    from: 'ref_students_topics',
                    localField: '_id',
                    foreignField: 'topicId',
                    as: 'studentRefs'
                }
            },
            {
                $lookup: {
                    from: 'students',
                    localField: 'studentRefs.studentId',
                    foreignField: '_id',
                    as: 'students'
                }
            },
            {
                $addFields: {
                    isRegistered: {
                        $or: [
                            {
                                $in: [new mongoose.Types.ObjectId(userId), '$studentRefs.studentId']
                            },
                            {
                                $in: [new mongoose.Types.ObjectId(userId), '$lecturerRefs.lecturerId']
                            }
                        ]
                    },
                    isSaved: { $gt: [{ $size: '$savedInfo' }, 0] }
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
        return pipeline
    }
}
