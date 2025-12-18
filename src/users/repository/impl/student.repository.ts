import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { ClientSession, Model, Types } from 'mongoose'
import * as bcrypt from 'bcrypt'
import { StudentRepositoryInterface } from '../student.repository.interface'
import { Student, StudentDocument } from '../../schemas/student.schema'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto'
import { PaginationQueryDto as Pagination_An } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated } from '../../../common/pagination/interface/paginated.interface'
import { Paginated as Paginated_An } from '../../../common/pagination-an/interfaces/paginated.interface'
import {
    CreateBatchStudentDto,
    CreateStudentDto,
    UpdateStudentProfileDto,
    UpdateStudentTableDto
} from '../../dtos/student.dto'
import { User } from '../../schemas/users.schema'
import { PaginationProvider } from '../../../common/pagination-an/providers/pagination.provider'
import { RequestGetStudentDto } from '../../dtos/request-get.dto'
import { UserRole } from '../../enums/user-role'
import { Faculty } from '../../../modules/faculties/schemas/faculty.schema'
import { HashingProvider } from '../../../auth/providers/hashing.provider'
import { Major } from '../../../modules/majors/schemas/majors.schemas'

@Injectable()
export class StudentRepository extends BaseRepositoryAbstract<Student> implements StudentRepositoryInterface {
    constructor(
        @InjectModel(Student.name) private readonly studentModel: Model<Student>,
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        @InjectModel(Faculty.name)
        private readonly facultyModel: Model<Faculty>,
        @InjectModel(Major.name)
        private readonly majorModel: Model<Major>,
        private readonly hashingProvider: HashingProvider,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(studentModel)
    }

    // Updated bulk create method in StudentRepository (add checks for studentCode and phone)
    private readonly logger = new Logger(StudentRepository.name)

    async createMany(dtos: CreateBatchStudentDto[]): Promise<{
        success: { studentCode: string; fullName: string; email: string }[]
        failed: { fullName: string; reason: string }[]
    }> {
        this.logger.log(`🚀 Bắt đầu tạo hàng loạt sinh viên | Tổng: ${dtos.length}`)

        const success: { studentCode: string; fullName: string; email: string }[] = []
        const failed: { fullName: string; reason: string }[] = []

        // Lấy email, phone hiện có từ User
        this.logger.log('🔍 Lấy danh sách email và phone đã tồn tại')
        const existedUsers = await this.userModel.find().select('email phone -_id').lean().exec()
        const emailSet = new Set(existedUsers.map((u) => u.email))
        const phoneSet = new Set(existedUsers.map((u) => u.phone).filter((p) => p)) // Filter empty phones

        // Lấy studentCode hiện có từ Student
        const existedStudentCodes = await this.studentModel
            .find()
            .select('studentCode -_id')
            .lean()
            .exec()
            .then((s) => s.map((x) => x.studentCode))

        const studentCodeSet = new Set(existedStudentCodes)

        this.logger.log(`📧 Tổng email đã tồn tại: ${emailSet.size}`)
        this.logger.log(`📱 Tổng phone đã tồn tại: ${phoneSet.size}`)
        this.logger.log(`🆔 Tổng studentCode đã tồn tại: ${studentCodeSet.size}`)

        const DEFAULT_PASSWORD = '123456789'

        for (const [index, dto] of dtos.entries()) {
            this.logger.log(`➡️ [${index + 1}/${dtos.length}] Xử lý sinh viên: ${dto.fullName}`)

            try {
                // CHECK STUDENTCODE DUPLICATE
                if (studentCodeSet.has(dto.studentCode)) {
                    const reason = `Mã sinh viên '${dto.studentCode}' đã tồn tại`
                    this.logger.warn(`⚠️ ${dto.fullName} | ${reason}`)
                    failed.push({
                        fullName: dto.fullName,
                        reason
                    })
                    continue
                }
                studentCodeSet.add(dto.studentCode)

                // CHECK PHONE DUPLICATE (if provided)
                if (dto.phone && phoneSet.has(dto.phone)) {
                    const reason = `Số điện thoại '${dto.phone}' đã tồn tại`
                    this.logger.warn(`⚠️ ${dto.fullName} | ${reason}`)
                    failed.push({
                        fullName: dto.fullName,
                        reason
                    })
                    continue
                }
                if (dto.phone) phoneSet.add(dto.phone)

                // EMAIL
                if (!dto.email) {
                    const reason = 'Email không được cung cấp'
                    this.logger.warn(`⚠️ ${dto.fullName} | ${reason}`)
                    failed.push({
                        fullName: dto.fullName,
                        reason
                    })
                    continue
                }

                if (emailSet.has(dto.email)) {
                    const reason = `Email '${dto.email}' đã tồn tại`
                    this.logger.warn(`⚠️ ${dto.fullName} | ${reason}`)
                    failed.push({
                        fullName: dto.fullName,
                        reason
                    })
                    continue
                }
                emailSet.add(dto.email)

                this.logger.log(`📧 Email được sử dụng: ${dto.email}`)

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

                // TÌM MAJOR
                const major = await this.majorModel.findOne({ name: dto.major }).lean()

                if (!major) {
                    const reason = `Không tìm thấy chuyên ngành '${dto.major}'`

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
                        email: dto.email,
                        password_hash: hashedPassword,
                        fullName: dto.fullName,
                        role: UserRole.STUDENT,
                        isActive: dto.isActive ?? true,
                        phone: dto.phone ?? ''
                    }
                ])

                this.logger.log(`👤 User tạo thành công | id=${user._id.toString()}`)

                // TẠO STUDENT
                await this.studentModel.create([
                    {
                        userId: user._id,
                        studentCode: dto.studentCode,
                        class: dto.class,
                        major: dto.major,
                        facultyId: faculty._id
                    }
                ])

                this.logger.log(`🎓 Student tạo thành công | ${dto.fullName} - ${faculty.name} - ${major.name}`)

                // SUCCESS
                success.push({
                    studentCode: dto.studentCode,
                    fullName: user.fullName,
                    email: user.email
                })
            } catch (error) {
                const reason = error?.message ?? 'Không rõ lỗi'

                this.logger.error(`❌ Lỗi khi tạo sinh viên: ${dto.fullName}`, error?.stack)

                failed.push({
                    fullName: dto.fullName,
                    reason
                })
            }
        }

        // SUMMARY
        this.logger.log('📊 Kết quả tạo hàng loạt sinh viên')
        this.logger.log(`✅ Thành công: ${success.length}`)
        this.logger.log(`❌ Thất bại: ${failed.length}`)

        return { success, failed }
    }
    async getById(id: string) {
        const student = await this.studentModel
            .findOne({ userId: new Types.ObjectId(id) })
            .populate('userId')
            .populate('facultyId')
            .exec()
        return student
    }

    async findByEmail(email: string): Promise<StudentDocument | null> {
        return this.studentModel.findOne({ email, deleted_at: null }).exec()
    }

    async updatePassword(id: string, newHash: string): Promise<void> {
        await this.studentModel.updateOne({ _id: id, deleted_at: null }, { password_hash: newHash }).exec()
    }

    async createStudent(
        userId: string,
        dto: CreateStudentDto,
        options?: { session?: ClientSession }
    ): Promise<Student> {
        const student = new this.studentModel({
            userId: new Types.ObjectId(userId),
            studentCode: dto.studentCode,
            class: dto.class,
            major: dto.major,
            facultyId: new Types.ObjectId(dto.facultyId)
        })
        return student.save({ session: options?.session })
    }

    async updateStudentByTable(id: string, dto: UpdateStudentTableDto) {
        const objectId = new Types.ObjectId(id)
        const student = await this.studentModel.findOne({ userId: objectId })
        if (!student) throw new Error('Student not found')

        const user = await this.userModel.findById(objectId)
        if (!user) throw new Error('User not found')

        // Check for duplicates before any update
        let hasChanges = false

        // Check email duplicate (if provided and different)
        if (dto.email !== undefined && dto.email !== user.email) {
            const existingEmail = await this.userModel.findOne({
                email: dto.email,
                _id: { $ne: objectId } // Exclude current user
            })
            if (existingEmail) {
                throw new Error(`Email '${dto.email}' đã tồn tại`)
            }
            hasChanges = true
        }

        // Check phone duplicate (if provided and different)
        if (dto.phone !== undefined && dto.phone !== user.phone && dto.phone) {
            // Only check if non-empty
            const existingPhone = await this.userModel.findOne({
                phone: dto.phone,
                _id: { $ne: objectId } // Exclude current user
            })
            if (existingPhone) {
                throw new Error(`Số điện thoại '${dto.phone}' đã tồn tại`)
            }
            hasChanges = true
        }

        // Check studentCode duplicate (if provided and different)
        if (dto.studentCode !== undefined && dto.studentCode !== student.studentCode) {
            const existingStudentCode = await this.studentModel.findOne({
                studentCode: dto.studentCode,
                userId: { $ne: objectId } // Exclude current student
            })
            if (existingStudentCode) {
                throw new Error(`Mã sinh viên '${dto.studentCode}' đã tồn tại`)
            }
            hasChanges = true
        }

        // If no changes, return early
        if (
            !hasChanges &&
            dto.fullName === user.fullName &&
            dto.isActive === user.isActive &&
            dto.class === student.class &&
            dto.major === student.major &&
            (dto.facultyId ? student.facultyId?.toString() === dto.facultyId : true)
        ) {
            return { message: 'No changes detected' }
        }

        // Update user-related fields (only changed ones)
        const userUpdate: any = {}
        if (dto.fullName !== undefined && dto.fullName !== user.fullName) userUpdate.fullName = dto.fullName
        if (dto.email !== undefined && dto.email !== user.email) userUpdate.email = dto.email
        if (dto.isActive !== undefined && dto.isActive !== user.isActive) userUpdate.isActive = dto.isActive
        if (dto.phone !== undefined && dto.phone !== user.phone) userUpdate.phone = dto.phone

        if (Object.keys(userUpdate).length > 0) {
            await this.userModel.findByIdAndUpdate(objectId, userUpdate)
        }

        // Update student-related fields (only changed ones)
        if (dto.studentCode !== undefined && dto.studentCode !== student.studentCode) {
            student.studentCode = dto.studentCode
        }
        if (dto.class !== undefined && dto.class !== student.class) {
            student.class = dto.class
        }
        if (dto.major !== undefined && dto.major !== student.major) {
            student.major = dto.major
        }
        if (dto.facultyId !== undefined && dto.facultyId !== student.facultyId) {
            student.facultyId = dto.facultyId
        }

        // Save student if any student field changed
        const hasStudentChanges =
            dto.studentCode !== undefined ||
            dto.class !== undefined ||
            dto.major !== undefined ||
            dto.facultyId !== undefined
        if (hasStudentChanges) {
            await student.save()
        }

        return { message: 'Updated successfully' }
    }
    async updateStudentProfile(userId: string, dto: UpdateStudentProfileDto) {
        const objectId = new Types.ObjectId(userId)
        const student = await this.studentModel.findOne({ userId: objectId })
        if (!student) throw new Error('Student not found')

        let userUpdate: Partial<User> = {}
        if (dto.fullName !== undefined) userUpdate.fullName = dto.fullName
        if (dto.email !== undefined) userUpdate.email = dto.email
        if (dto.bio !== undefined) userUpdate.bio = dto.bio
        if (dto.phone !== undefined) userUpdate.phone = dto.phone
        if (dto.avatarUrl !== undefined) userUpdate.avatarUrl = dto.avatarUrl
        if (dto.isActive !== undefined) userUpdate.isActive = dto.isActive

        if (Object.keys(userUpdate).length > 0) {
            await this.userModel.findByIdAndUpdate(objectId, userUpdate, { new: true })
        }

        // Update student fields
        if (dto.skills) student.skills = dto.skills
        if (dto.interests) student.interests = dto.interests

        await student.save()
        return { message: 'Profile updated successfully' }
    }

    async getStudents(query: RequestGetStudentDto): Promise<Paginated_An<any>> {
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
                studentCode: '$studentCode',
                fullName: '$user.fullName',
                class: '$class',
                major: '$major',
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
                ...(query.major && query.major !== 'all' ? { major: query.major } : {}),

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

        return await this.paginationProvider.paginateQuery<any>(query, this.studentModel, pipelineSub)
    }

    async removeByUserId(userId: string): Promise<{ deletedCount?: number }> {
        const objectId = new Types.ObjectId(userId)
        const result = await this.studentModel.deleteOne({ userId: objectId })
        return { deletedCount: result.deletedCount }
    }
    async getAllStudentsAn(paginationQuery: Pagination_An): Promise<Paginated_An<Student>> {
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
            $project: {
                _id: '$user._id',
                fullName: '$user.fullName',
                email: '$user.email',
                phone: '$user.phone',
                studentCode: 1,
                class: 1,
                major: 1,
                avatarUrl: '$user.avatarUrl'
            }
        })
        return await this.paginationProvider.paginateQuery<Student>(paginationQuery, this.studentModel, pipeline)
    }
}
