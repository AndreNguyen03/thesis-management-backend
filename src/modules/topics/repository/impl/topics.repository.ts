import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { plainToInstance } from 'class-transformer'
import { Topic } from '../../schemas/topic.schemas'
import { CreateTopicDto, GetTopicResponseDto } from '../../dtos'
import { TopicRepositoryInterface } from '../topic.repository.interface'
import { Model } from 'mongoose'
import { title } from 'process'
import { Lecturer } from '../../../../users/schemas/lecturer.schema'

export class TopicRepository extends BaseRepositoryAbstract<Topic> implements TopicRepositoryInterface {
    public constructor(
        @InjectModel(Topic.name)
        private readonly topicRepository: Model<Topic>
        //   @InjectModel(UserSavedTopics.name) private readonly archiveRepository: Model<UserSavedTopics>
    ) {
        super(topicRepository)
    }
    async createTopic(topicData: CreateTopicDto): Promise<GetTopicResponseDto> {
        const createdTopic = await (await this.topicRepository.create(topicData)).populate('majorId', 'name')
        return plainToInstance(GetTopicResponseDto, createdTopic, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }
    async findByTitle(title: string): Promise<Topic | null> {
        return this.topicRepository.findOne({ title, deleted_at: null }).lean()
    }
    async getAllTopics(): Promise<GetTopicResponseDto[]> {
        // const topics = await this.topicRepository.find({ deleted_at: null }).populate('majorId', 'name')
        // return plainToInstance(GetTopicResponseDto, topics, {
        //     excludeExtraneousValues: true,
        //     enableImplicitConversion: true
        // })
        return await this.topicRepository.aggregate([
            { $match: { deleted_at: null } },
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
                    major: {
                        $map: {
                            input: '$major',
                            as: 'm',
                            in: '$$m.name'
                        }
                    },
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
                    fields: {
                        $map: {
                            input: '$fields',
                            as: 'field',
                            in: '$$field.name'
                        }
                    },
                    requirements: {
                        $map: {
                            input: '$requirements',
                            as: 'requirement',
                            in: '$$requirement.name'
                        }
                    }
                }
            }
        ])
    }

    async findSavedByUser(userId: string, role: string): Promise<GetTopicResponseDto[]> {
        const theses = await this.topicRepository
            .find({
                savedBy: { $elemMatch: { userId, role } }
            })
            .lean()
            .exec()
        // Chuyển đổi sang DTO
        return plainToInstance(GetTopicResponseDto, theses)
    }
}
