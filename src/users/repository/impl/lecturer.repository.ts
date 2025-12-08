import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { ClientSession, Document, Model, PipelineStage, Types } from 'mongoose'
import { LecturerRepositoryInterface } from '../lecturer.repository.interface'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { Lecturer, LecturerDocument } from '../../schemas/lecturer.schema'
import { CreateLecturerDto, UpdateLecturerProfileDto, UpdateLecturerTableDto } from '../../dtos/lecturer.dto'
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto'
import { PaginationQueryDto as PaginationAn } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated as Paginated_An } from '../../../common/pagination-an/interfaces/paginated.interface'

import { Paginated } from '../../../common/pagination/interface/paginated.interface'
import { User } from '../../schemas/users.schema'
import { Faculty } from '../../../modules/faculties/schemas/faculty.schema'
import { PaginationProvider } from '../../../common/pagination-an/providers/pagination.provider'
import { fa } from '@faker-js/faker/.'

@Injectable()
export class LecturerRepository extends BaseRepositoryAbstract<Lecturer> implements LecturerRepositoryInterface {
    constructor(
        @InjectModel(Lecturer.name)
        private readonly lecturerModel: Model<Lecturer>,
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(lecturerModel)
    }

    async updateLecturerByTable(id: string, dto: UpdateLecturerTableDto) {
        const objectId = new Types.ObjectId(id)
        const lecturer = await this.lecturerModel.findOne({ userId: objectId })
        if (!lecturer) throw new Error('Lecturer not found')

        // Update user-related fields
        if (dto.fullName || dto.email || dto.isActive !== undefined) {
            await this.userModel.findByIdAndUpdate(objectId, {
                fullName: dto.fullName,
                email: dto.email,
                isActive: dto.isActive,
                phone: dto.phone
            })
        }

        // Update lecturer-related fields
        if (dto.facultyId) {
            lecturer.facultyId = new Types.ObjectId(dto.facultyId)
        }
        if (dto.title) {
            console.log(`dto title, lecturer title`, dto.title, lecturer.title)
            lecturer.title = dto.title
        }
        await lecturer.save()

        return { message: 'Updated successfully' }
    }

    async updateLecturerProfile(userId: string, dto: UpdateLecturerProfileDto) {
        const objectId = new Types.ObjectId(userId)

        // Lấy lecturer
        const lecturer = await this.lecturerModel.findOne({ userId: objectId })
        if (!lecturer) throw new Error('Lecturer not found')

        // Cập nhật User fields
        const userUpdate: Partial<User> = {}
        if (dto.fullName !== undefined) userUpdate.fullName = dto.fullName
        if (dto.email !== undefined) userUpdate.email = dto.email
        if (dto.bio !== undefined) userUpdate.bio = dto.bio
        if (dto.phone !== undefined) userUpdate.phone = dto.phone
        if (dto.avatarUrl !== undefined) userUpdate.avatarUrl = dto.avatarUrl
        if (dto.isActive !== undefined) userUpdate.isActive = dto.isActive

        if (Object.keys(userUpdate).length > 0) {
            await this.userModel.findByIdAndUpdate(objectId, userUpdate, { new: true })
        }

        // Cập nhật Lecturer fields
        if (dto.facultyId !== undefined) lecturer.facultyId = new Types.ObjectId(dto.facultyId)
        if (dto.title !== undefined) lecturer.title = dto.title
        if (dto.areaInterest !== undefined) lecturer.areaInterest = dto.areaInterest
        if (dto.researchInterests !== undefined) lecturer.researchInterests = dto.researchInterests
        if (dto.publications !== undefined) {
            lecturer.publications = dto.publications.map((pub) => ({
                title: pub.title ?? '',
                journal: pub.journal ?? '',
                conference: pub.conference ?? '',
                year: pub.year ?? '',
                type: pub.type ?? '',
                citations: pub.citations ?? 0,
                link: pub.link ?? ''
            }))
        }
        await lecturer.save()

        return { message: 'Profile updated successfully' }
    }

    async getLecturers(query: PaginationQueryDto): Promise<Paginated<any>> {
        const { page, page_size, search_by, query: q, sort_by, sort_order } = query

        const pipeline: any[] = [
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $lookup: {
                    from: 'faculties',
                    localField: 'facultyId',
                    foreignField: '_id',
                    as: 'faculty'
                }
            },
            { $unwind: '$faculty' }
        ]

        // search (chỉ cho phép search theo các field định trước)
        if (search_by && q) {
            const searchFieldMap: Record<string, string> = {
                fullName: 'user.fullName',
                email: 'user.email',
                phone: 'user.phone'
            }

            const searchField = searchFieldMap[search_by]
            if (searchField) {
                pipeline.push({
                    $match: {
                        [searchField]: { $regex: q, $options: 'i' }
                    }
                })
            }
        }

        // sort
        pipeline.push({
            $sort: { [sort_by || 'createdAt']: sort_order === 'asc' ? 1 : -1 }
        })

        // pagination
        const skip = (page - 1) * page_size
        pipeline.push({ $skip: skip }, { $limit: page_size })

        // flat data
        pipeline.push({
            $project: {
                id: '$user._id',
                fullName: '$user.fullName',
                email: '$user.email',
                phone: '$user.phone',
                facultyName: '$faculty.name',
                facultyId: '$faculty._id',
                role: '$user.role',
                title: 1,
                createdAt: 1,
                isActive: '$user.isActive'
            }
        })

        // chạy song song aggregate & count
        const [data, total] = await Promise.all([
            this.lecturerModel.aggregate(pipeline),
            this.lecturerModel.countDocuments()
        ])

        return { datas: data, totalRecords: total }
    }

    async findByEmail(email: string): Promise<LecturerDocument | null> {
        return this.lecturerModel.findOne({ email, deleted_at: null }).exec()
    }

    async updatePassword(id: string, newHash: string): Promise<void> {
        await this.lecturerModel.updateOne({ _id: id, deleted_at: null }, { password_hash: newHash }).exec()
    }

    async createLecturer(
        userId: string,
        dto: CreateLecturerDto,
        options?: { session?: ClientSession }
    ): Promise<Lecturer> {
        const lecturer = new this.lecturerModel({
            userId: new Types.ObjectId(userId),
            facultyId: new Types.ObjectId(dto.facultyId),
            title: dto.title
        })
        return lecturer.save({ session: options?.session })
    }

    async removeByUserId(userId: string): Promise<{ deletedCount?: number }> {
        const objectId = new Types.ObjectId(userId)
        const result = await this.lecturerModel.deleteOne({ userId: objectId })
        return { deletedCount: result.deletedCount }
    }

    async getById(id: string) {
        const lecturer = await this.lecturerModel
            .findOne({ userId: new Types.ObjectId(id) })
            .populate('userId')
            .populate('facultyId')
            .exec()
        return lecturer
    }
    async getAllLecturersAn(facultyId: string, paginationQuery: PaginationAn): Promise<Paginated_An<Lecturer>> {
        console.log('facultyId trong repo:', facultyId, paginationQuery)
        const pipeline: any[] = [
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $lookup: {
                    from: 'faculties',
                    localField: 'facultyId',
                    foreignField: '_id',
                    as: 'faculty'
                }
            },
            { $unwind: '$faculty' }
        ]
        pipeline.push({
            $match: {
                facultyId: new Types.ObjectId(facultyId),
                'user.isActive': true
            }
        })
        pipeline.push({
            $project: {
                _id: '$user._id',
                fullName: '$user.fullName',
                email: '$user.email',
                phone: '$user.phone',
                role: '$user.role',
                title: 1,
                avatarUrl: '$user.avatarUrl'
            }
        })

        return this.paginationProvider.paginateQuery<Lecturer>(paginationQuery, this.lecturerModel, pipeline)
    }

}
