import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectModel } from '@nestjs/mongoose'
import mongoose, { ClientSession, Connection, Document, Model, PipelineStage, Types } from 'mongoose'
import { LecturerRepositoryInterface } from '../lecturer.repository.interface'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { Lecturer, LecturerDocument } from '../../schemas/lecturer.schema'
import {
    CreateBatchLecturerDto,
    CreateLecturerDto,
    UpdateLecturerProfileDto,
    UpdateLecturerTableDto
} from '../../dtos/lecturer.dto'
import { User } from '../../schemas/users.schema'
import { Faculty } from '../../../modules/faculties/schemas/faculty.schema'
import { generateEmail } from '../../helpers/email-gen'
import { HashingProvider } from '../../../auth/providers/hashing.provider'
import { UserRole } from '../../../auth/enum/user-role.enum'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination-an/interfaces/paginated.interface'
import { PaginationProvider } from '../../../common/pagination-an/providers/pagination.provider'
import { ForeignKey } from 'typeorm'

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

    async createMany(dtos: CreateBatchLecturerDto[]): Promise<{
        success: { fullName: string; email: string; facultyName: string }[]
        failed: { fullName: string; reason: string }[]
    }> {
        console.log('=== START BATCH CREATE LECTURERS ===')
        console.log('Input DTOs:', JSON.stringify(dtos, null, 2))

        const success: { fullName: string; email: string; facultyName: string }[] = []
        const failed: { fullName: string; reason: string }[] = []

        // Lấy email hiện có
        console.log('[STEP] Fetching existing emails...')
        const existedEmails = await this.userModel
            .find()
            .select('email -_id')
            .lean()
            .exec()
            .then((u) => u.map((x) => x.email))

        console.log('Existing emails:', existedEmails)
        const emailSet = new Set(existedEmails)

        const DEFAULT_PASSWORD = '123456789'

        for (const dto of dtos) {
            console.log('\n-------------------------')
            console.log(`Processing lecturer: ${dto.fullName}`)

            try {
                // GEN EMAIL
                const email = generateEmail(dto.fullName, emailSet)
                emailSet.add(email)
                console.log('Generated email:', email)

                // TÌM FACULTY
                console.log('Finding faculty:', dto.facultyName)
                const faculty = await this.facultyModel.findOne({ name: dto.facultyName }).lean()

                if (!faculty) {
                    console.log('❌ Faculty not found:', dto.facultyName)
                    failed.push({
                        fullName: dto.fullName,
                        reason: `Không tìm thấy khoa '${dto.facultyName}'`
                    })
                    continue
                }

                console.log('Faculty found:', faculty)

                // HASH PASSWORD
                console.log('Hashing default password...')
                const hashedPassword = await this.hashingProvider.hashPassword(DEFAULT_PASSWORD)
                console.log('Hashed password:', hashedPassword)

                // TẠO USER
                console.log('Creating User document with data:', {
                    email,
                    fullName: dto.fullName,
                    role: UserRole.LECTURER,
                    facultyId: faculty._id
                })

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

                console.log('User created with ID:', user._id)

                // TẠO LECTURER
                console.log('Creating Lecturer document...')
                const [lecturer] = await this.lecturerModel.create([
                    {
                        userId: user._id,
                        title: dto.title,
                        facultyId: faculty._id
                    }
                ])

                console.log('Lecturer created with ID:', lecturer._id)

                // SUCCESS
                success.push({
                    fullName: user.fullName,
                    email: user.email,
                    facultyName: faculty.name
                })

                console.log('✔ SUCCESS:', user.fullName)
            } catch (error) {
                console.log('❌ ERROR in processing:', error)

                failed.push({
                    fullName: dto.fullName,
                    reason: error?.message ?? 'Không rõ lỗi'
                })
            }
        }

        console.log('\n=== END BATCH CREATE ===')
        console.log('Success:', success)
        console.log('Failed:', failed)

        return { success, failed }
    }

    async getLecturersByFaculty(facultyId: string) {
        const objectFacultyId = new Types.ObjectId(facultyId)
        const lecturers = await this.lecturerModel
            .find({ facultyId: objectFacultyId })
            .populate('userId')
            .populate('facultyId')
            .exec()
        return lecturers
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
        const lecturer = await this.lecturerModel.findOne({ userId: objectId })
        if (!lecturer) throw new Error('Lecturer not found')

        // Update user fields
        if (dto.fullName || dto.email || dto.isActive !== undefined) {
            await this.userModel.findByIdAndUpdate(objectId, {
                fullName: dto.fullName,
                email: dto.email,
                isActive: dto.isActive,
                phone: dto.phone,
                avatarUrl: dto.avatarUrl
            })
        }

        // Update lecturer fields
        if (dto.facultyId) lecturer.facultyId = new Types.ObjectId(dto.facultyId)
        if (dto.title) {
            console.log(`dto title, lecturer title`, dto.title, lecturer.title)
            lecturer.title = dto.title
        }
        if (dto.areaInterest) lecturer.areaInterest = dto.areaInterest
        if (dto.researchInterests) lecturer.researchInterests = dto.researchInterests
        if (dto.supervisedThesisIds)
            lecturer.supervisedThesisIds = dto.supervisedThesisIds.map((id) => new Types.ObjectId(id))
        if (dto.publications) lecturer.publications = dto.publications
        await lecturer.save()
        return { message: 'Profile updated successfully' }
    }

    async getLecturers(query: PaginationQueryDto): Promise<Paginated<Lecturer>> {
        const lecturerPipeline: any[] = [
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $lookup: { from: 'faculties', localField: 'facultyId', foreignField: '_id', as: 'faculty' } },
            { $unwind: '$faculty' },
            {
                $project: {
                    id: '$user._id',
                    fullName: '$user.fullName',
                    email: '$user.email',
                    phone: '$user.phone',
                    title: 1,
                    facultyId: '$faculty._id',
                    facultyName: '$faculty.name',
                    role: '$user.role',
                    isActive: '$user.isActive',
                    createdAt: 1
                }
            }
        ]

        const lecturers = await this.paginationProvider.paginateQuery<Lecturer>(
            query,
            this.lecturerModel,
            lecturerPipeline
        )
        return lecturers
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
}
