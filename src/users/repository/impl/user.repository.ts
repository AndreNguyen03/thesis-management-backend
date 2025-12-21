import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { ClientSession, Model, Types } from 'mongoose'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { User } from '../../schemas/users.schema'
import { UserRepositoryInterface } from '../user.repository.interface'
import { HashingProvider } from '../../../auth/providers/hashing.provider'
import { UserRole } from '../../enums/user-role'
import { CreateUserDto } from '../../dtos/create-user.dto'
import { from } from 'form-data'
import { de } from '@faker-js/faker/.'
import { PaginatedSearchUserDto, SearchUserItemDto, SearchUserQueryDto } from '../../dtos/search-user.dto'
import { PaginationProvider } from '../../../common/pagination-an/providers/pagination.provider'

@Injectable()
export class UserRepository extends BaseRepositoryAbstract<User> implements UserRepositoryInterface {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
        private readonly hashingProvider: HashingProvider,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(userModel)
    }

    async getUsersByUserIds(userIds: string[]): Promise<User[]> {
        const objectIds = userIds.map((id) => new mongoose.Types.ObjectId(id))
        return await this.userModel.find({ _id: { $in: objectIds }, deleted_at: null, isActive: true }).exec()
    }
    async findByEmail(email: string): Promise<User | null> {
        return this.userModel.findOne({ email, deleted_at: null }).exec()
    }

    async updatePassword(id: string, newHash: string): Promise<boolean> {
        const result = await this.userModel.updateOne({ _id: id, deleted_at: null }, { password_hash: newHash }).exec()
        return result.modifiedCount > 0
    }

    async createUser(dto: CreateUserDto, role: UserRole, options?: { session?: ClientSession }): Promise<User> {
        const passwordHash = await this.hashingProvider.hashPassword(dto.password)
        const user = new this.userModel({
            email: dto.email,
            password_hash: passwordHash,
            fullName: dto.fullName,
            phone: dto.phone,
            role: role,
            isActive: dto.isActive
        })
        return user.save({ session: options?.session })
    }

    async removeById(userId: string): Promise<{ deletedCount?: number }> {
        const objectId = new Types.ObjectId(userId)
        const result = await this.userModel.deleteOne({ _id: objectId })
        return { deletedCount: result.deletedCount }
    }
    async getEmailListOfUsers(userIds: string[]): Promise<string[]> {
        const res = await this.userModel.find(
            { _id: { $in: userIds.map((id) => new Types.ObjectId(id)) } },
            { email: 1, _id: 0 }
        )
        return res.map((user) => user.email)
    }
    async getEmailListFromLecturerInFaculty(facultyId: string): Promise<string[]> {
        let pipeline: any[] = []
        pipeline.push(
            {
                $lookup: {
                    from: 'lecturers',
                    let: { facultyId: facultyId },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$facultyId', new Types.ObjectId(facultyId)] },
                                        { $eq: ['$deleted_at', null] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'lecturers'
                }
            },
            //lấy tất cả các userId crua gv thuộc khoa
            {
                $addFields: {
                    lecturerUserIds: {
                        $map: {
                            input: '$lecturers',
                            as: 'lecturer',
                            in: '$$lecturer.userId'
                        }
                    }
                }
            },
            {
                $match: {
                    $expr: {
                        $and: [
                            { $in: ['$_id', '$lecturerUserIds'] },
                            { $eq: ['$isActive', true] },
                            { $eq: ['$deleted_at', null] }
                        ]
                    }
                }
            },
            {
                $project: {
                    email: 1,
                    _id: 0
                }
            }
        )
        const res = await this.userModel.aggregate(pipeline).exec()
        return res.map((user) => user.email)
    }
    async getEmailListFromStudentInFaculty(facultyId: string): Promise<string[]> {
        console.log('facultyId trong repo:', facultyId)
        let pipeline: any[] = []
        pipeline.push(
            {
                //lấy danh sách sinh viên thuộc khoa
                $lookup: {
                    from: 'students',
                    let: { facultyId: facultyId },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$facultyId', new Types.ObjectId(facultyId)] },
                                        { $eq: ['$deleted_at', null] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'students'
                }
            },
            //lấy tất cả các userId crua sv thuộc khoa
            {
                $addFields: {
                    studentUserIds: {
                        $map: {
                            input: '$students',
                            as: 'student',
                            in: '$$student.userId'
                        }
                    }
                }
            },
            {
                $match: {
                    $expr: {
                        $and: [
                            { $in: ['$_id', '$studentUserIds'] },
                            { $eq: ['$isActive', true] },
                            { $eq: ['$deleted_at', null] }
                        ]
                    }
                }
            },
            {
                $project: {
                    email: 1,
                    _id: 0
                }
            }
        )
        const res = await this.userModel.aggregate(pipeline).exec()
        return res.map((user) => user.email)
    }
    //lấy danh sách các user có trong khoa theo facultyId
    async getUsersByFacultyId(facultyId: string): Promise<User[]> {
        let pipeline: any[] = []
        pipeline.push(
            {
                $lookup: {
                    from: 'lecturers',
                    let: { facultyId: facultyId },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$facultyId', new Types.ObjectId(facultyId)] },
                                        { $eq: ['$deleted_at', null] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'lecturers'
                }
            },
            {
                $lookup: {
                    from: 'students',
                    let: { facultyId: facultyId },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$facultyId', new Types.ObjectId(facultyId)] },
                                        { $eq: ['$deleted_at', null] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'students'
                }
            },
            {
                $lookup: {
                    from: 'faculty_boards',
                    let: { facultyId: facultyId },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$facultyId', new Types.ObjectId(facultyId)] },
                                        { $eq: ['$deleted_at', null] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'facultyBoards'
                }
            },
            {
                $addFields: {
                    userIds: {
                        $setUnion: [
                            {
                                $map: {
                                    input: '$lecturers',
                                    as: 'lecturer',
                                    in: '$$lecturer.userId'
                                }
                            },
                            {
                                $map: {
                                    input: '$students',
                                    as: 'student',
                                    in: '$$student.userId'
                                }
                            },
                            {
                                $map: {
                                    input: '$facultyBoards',
                                    as: 'facultyBoard',
                                    in: '$$facultyBoard.userId'
                                }
                            }
                        ]
                    }
                }
            },
            {
                $match: {
                    $expr: {
                        $and: [
                            { $in: ['$_id', '$userIds'] },
                            { $eq: ['$isActive', true] },
                            { $eq: ['$deleted_at', null] }
                        ]
                    }
                }
            }
        )
        return await this.userModel.aggregate(pipeline)
    }

    // repositories/user-search.repository.ts
    async searchUsers(queryDto: SearchUserQueryDto): Promise<PaginatedSearchUserDto> {
        const { query, page = 1, limit = 10 } = queryDto

        const pipeline: any[] = []

        // Join student info
        pipeline.push({
            $lookup: {
                from: 'students',
                localField: '_id',
                foreignField: 'userId',
                as: 'student'
            }
        })
        pipeline.push({
            $unwind: { path: '$student', preserveNullAndEmptyArrays: true }
        })

        // Join lecturer info
        pipeline.push({
            $lookup: {
                from: 'lecturers',
                localField: '_id',
                foreignField: 'userId',
                as: 'lecturer'
            }
        })
        pipeline.push({
            $unwind: { path: '$lecturer', preserveNullAndEmptyArrays: true }
        })

        // Search theo tên, email, mssv
        if (query) {
            pipeline.push({
                $match: {
                    $or: [
                        { fullName: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } },
                        { 'student.studentCode': { $regex: query, $options: 'i' } }
                    ]
                }
            })
        }

        // Project fields cho frontend
        pipeline.push({
            $project: {
                id: '$_id',
                fullName: 1,
                email: 1,
                role: 1,
                studentCode: '$student.studentCode',
                title: '$lecturer.title',
                avatarUrl: 1
            }
        })

        const result = await this.paginationProvider.paginateQuery<User>({ limit, page }, this.userModel, pipeline)

        const data: SearchUserItemDto[] = result.data.map((u: any) => ({
            id: u._id.toString(),
            fullName: u.fullName,
            email: u.email,
            role: u.role,
            studentCode: u.studentCode,
            title: u.title,
            avatarUrl: u.avatarUrl
        }))

        return { data, meta: result.meta }
    }
}
