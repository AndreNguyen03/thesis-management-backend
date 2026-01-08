import { ClientSession } from 'mongoose'
import { BaseRepositoryInterface } from '../../shared/base/repository/base.repository.interface'
import { CreateBatchLecturerDto, CreateLecturerDto, UpdateLecturerProfileDto, UpdateLecturerTableDto } from '../dtos/lecturer.dto'
import { Lecturer, LecturerDocument } from '../schemas/lecturer.schema'
import { PaginationQueryDto as PaginationAn } from '../../common/pagination-an/dtos/pagination-query.dto'
import { Paginated as Paginated_An } from '../../common/pagination-an/interfaces/paginated.interface'
import { RequestGetLecturerDto } from '../dtos/request-get.dto'

export interface LecturerRepositoryInterface extends BaseRepositoryInterface<Lecturer> {
    findByEmail(email: string): Promise<LecturerDocument | null>
    updatePassword(id: string, newHash: string): Promise<void>
    createLecturer(userId: string, dto: CreateLecturerDto, options?: { session?: ClientSession }): Promise<Lecturer>
    getLecturers(paginationQuery: RequestGetLecturerDto): Promise<Paginated_An<any>>
    getAllLecturerHaveProfile(): Promise<any[]>
    getAllLecturersAn(facultyId: string, paginationQuery: PaginationAn): Promise<Paginated_An<Lecturer>>
    updateLecturerByTable(id: string, dto: UpdateLecturerTableDto): Promise<any>
    updateLecturerProfile(userId: string, dto: UpdateLecturerProfileDto): Promise<any>
    removeByUserId(userId: string): Promise<{ deletedCount?: number }>
    getById(id: string)
    createMany(dtos: CreateBatchLecturerDto[]): Promise<{
        success: {
            fullName: string
            email: string
            facultyName: string
        }[]
        failed: {
            fullName: string
            reason: string
        }[]
    }>
}
