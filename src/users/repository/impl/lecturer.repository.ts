import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { ClientSession, Document, Model, PipelineStage, Types } from 'mongoose'
import { LecturerRepositoryInterface } from '../lecturer.repository.interface'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { Lecturer, LecturerDocument } from '../../schemas/lecturer.schema'
import {
    CreateBatchLecturerDto,
    CreateLecturerDto,
    UpdateLecturerProfileDto,
    UpdateLecturerTableDto
} from '../../dtos/lecturer.dto'
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto'
import { PaginationQueryDto as PaginationAn } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated as Paginated_An } from '../../../common/pagination-an/interfaces/paginated.interface'

import { User } from '../../schemas/users.schema'
import { Faculty } from '../../../modules/faculties/schemas/faculty.schema'
import { PaginationProvider } from '../../../common/pagination-an/providers/pagination.provider'
import { fa } from '@faker-js/faker/.'
import { RequestGetLecturerDto } from '../../dtos/request-get.dto'
import { generateEmail } from '../../helpers/email-gen'
import { HashingProvider } from '../../../auth/providers/hashing.provider'
import { UserRole } from '../../enums/user-role'

@Injectable()
export class LecturerRepository extends BaseRepositoryAbstract<Lecturer> implements LecturerRepositoryInterface {
    constructor(
        @InjectModel(Lecturer.name)
        private readonly lecturerModel: Model<Lecturer>,
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        @InjectModel(Faculty.name)
        private readonly facultyModel: Model<Faculty>,
        private readonly hashingProvider: HashingProvider,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(lecturerModel)
    }

    private readonly logger = new Logger(LecturerRepository.name)

    async createMany(dtos: CreateBatchLecturerDto[]): Promise<{
        success: { fullName: string; email: string; facultyName: string }[]
        failed: { fullName: string; reason: string }[]
    }> {
        this.logger.log(`🚀 Bắt đầu tạo hàng loạt giảng viên | Tổng: ${dtos.length}`)

        const success: { fullName: string; email: string; facultyName: string }[] = []
        const failed: { fullName: string; reason: string }[] = []

        // Lấy email hiện có
        this.logger.log('🔍 Lấy danh sách email đã tồn tại')

        const existedEmails = await this.userModel
            .find()
            .select('email -_id')
            .lean()
            .exec()
            .then((u) => u.map((x) => x.email))

        const emailSet = new Set(existedEmails)

        this.logger.log(`📧 Tổng email đã tồn tại: ${emailSet.size}`)

        const DEFAULT_PASSWORD = '123456789'

        for (const [index, dto] of dtos.entries()) {
            this.logger.log(`➡️ [${index + 1}/${dtos.length}] Xử lý giảng viên: ${dto.fullName}`)

            try {
                // GEN EMAIL
                const email = generateEmail(dto.fullName, emailSet)
                emailSet.add(email)

                this.logger.log(`📧 Email được tạo: ${email}`)

                // TÌM FACULTY
                const faculty = await this.facultyModel.findOne({ name: dto.facultyName }).lean()

                if (!faculty) {
                    const reason = `Không tìm thấy khoa '${dto.facultyName}'`

                    this.logger.warn(`⚠️ ${dto.fullName} | ${reason}`)

                    failed.push({
                        fullName: dto.fullName,
                        reason
                    })
                    continue
                }

                // HASH PASSWORD
                const hashedPassword = await this.hashingProvider.hashPassword(DEFAULT_PASSWORD)

                // TẠO USER
                const [user] = await this.userModel.create([
                    {
                        email,
                        password_hash: hashedPassword,
                        fullName: dto.fullName,
                        role: UserRole.LECTURER,
                        isActive: true,
                        phone: dto.phone ?? ''
                    }
                ])

                this.logger.log(`👤 User tạo thành công | id=${user._id.toString()}`)

                // TẠO LECTURER
                await this.lecturerModel.create([
                    {
                        userId: user._id,
                        title: dto.title,
                        facultyId: faculty._id
                    }
                ])

                this.logger.log(`🎓 Lecturer tạo thành công | ${dto.fullName} - ${faculty.name}`)

                // SUCCESS
                success.push({
                    fullName: user.fullName,
                    email: user.email,
                    facultyName: faculty.name
                })
            } catch (error) {
                const reason = error?.message ?? 'Không rõ lỗi'

                this.logger.error(`❌ Lỗi khi tạo giảng viên: ${dto.fullName}`, error?.stack)

                failed.push({
                    fullName: dto.fullName,
                    reason
                })
            }
        }

        // SUMMARY
        this.logger.log('📊 Kết quả tạo hàng loạt giảng viên')
        this.logger.log(`✅ Thành công: ${success.length}`)
        this.logger.log(`❌ Thất bại: ${failed.length}`)

        return { success, failed }
    }

    async updateLecturerByTable(id: string, dto: UpdateLecturerTableDto) {
        console.log(`Updating lecturer by table with id: ${id}`, dto)
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

    async getLecturers(query: RequestGetLecturerDto): Promise<Paginated_An<any>> {
        let pipelineSub: any[] = []

        // =======================
        // Join User
        // =======================
        pipelineSub.push(
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' }
        )

        // =======================
        // Join Faculty
        // =======================
        pipelineSub.push(
            {
                $lookup: {
                    from: 'faculties',
                    localField: 'facultyId',
                    foreignField: '_id',
                    as: 'faculty'
                }
            },
            { $unwind: '$faculty' }
        )

        // =======================
        // Add fields để filter / search
        // =======================
        pipelineSub.push({
            $addFields: {
                id: '$userId',
                title: '$title',
                fullName: '$user.fullName',
                email: '$user.email',
                phone: '$user.phone',
                facultyName: '$faculty.name',
                facultyId: '$faculty._id',
                isActive: '$user.isActive',
                createdAt: '$createdAt'
            }
        })

        // =======================
        // FILTER (BẮT BUỘC – giống getAllPeriods)
        // =======================
        pipelineSub.push({
            $match: {
                ...(query.title && query.title !== 'all' ? { title: query.title } : {}),

                ...(query.isActive !== undefined && query.isActive !== 'all' ? { isActive: query.isActive } : {}),

                ...(query.facultyId && query.facultyId !== 'all' && mongoose.Types.ObjectId.isValid(query.facultyId)
                    ? { facultyId: new mongoose.Types.ObjectId(query.facultyId) }
                    : {}),

                deleted_at: null
            }
        })

        // =======================
        // Sort
        // =======================
        pipelineSub.push({
            $sort: {
                createdAt: -1
            }
        })

        return this.paginationProvider.paginateQuery<any>(query, this.lecturerModel, pipelineSub)
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
