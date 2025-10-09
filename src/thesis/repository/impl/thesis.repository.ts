import { ThesisRepositoryInterface } from '../thesis.repository.interface'
import { Thesis } from '../../schemas/thesis.schemas'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model } from 'mongoose'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { GetThesisResponseDto } from '../../dtos'
import { plainToInstance } from 'class-transformer'

export class ThesisRepository extends BaseRepositoryAbstract<Thesis> implements ThesisRepositoryInterface {
    public constructor(
        @InjectModel(Thesis.name)
        private readonly thesisRepository: Model<Thesis>
    ) {
        super(thesisRepository)
    }
    async getAllTheses() {
        const theses = this.thesisRepository.find({ deleted_at: null }).exec()
        return theses
    }

    // async studentCancelRegistration(studentId: string, thesisId: string) {
    //     const thesis = await this.thesisRepository.findOne({ _id: thesisId, deleted_at: null }).exec()

    //     if (!thesis) {
    //         throw new ThesisNotFoundException()
    //     }

    //     const registrationToCancel = thesis.studentRegistrations.find(
    //         (reg) =>
    //             reg.registrantId.toString() === studentId && !reg.isDeleted && reg.status === RegistrationStatus.PENDING
    //     )
    //     if (!registrationToCancel) {
    //         throw new BadRequestException('Bạn chưa đăng ký đề tài này ')
    //     }
    //     registrationToCancel.isDeleted = true
    //     registrationToCancel.deletedAt = new Date()
    //     registrationToCancel.status = RegistrationStatus.CANCELED
    //     // Giảm số lượng sinh viên đã đăng ký
    //     thesis.registeredStudents = Math.max(0, thesis.registeredStudents - 1)
    //     return await thesis.save()
    // }

    async findSavedByUser(userId: string, role: string): Promise<GetThesisResponseDto[]> {
        const theses = await this.thesisRepository
            .find({
                savedBy: { $elemMatch: { userId, role } }
            })
            .lean()
            .exec()
        // Chuyển đổi sang DTO
        return plainToInstance(GetThesisResponseDto, theses)
    }
    async saveThesis(userId: string, role: string, thesisId: string) {
        return this.thesisRepository
            .findByIdAndUpdate(thesisId, { $addToSet: { savedBy: { userId, role } } }, { new: true })
            .exec()
    }

    /*    async studentCancelRegistration(studentId: string, thesisId: string) {
        const thesis = await this.thesisRepository.findOne({ _id: thesisId, deleted_at: null }).exec()

        if (!thesis) {
            throw new ThesisNotFoundException()
        }

        const registrationToCancel = thesis.registrations.find(
            (reg) =>
                reg.registrantId.toString() === studentId && !reg.isDeleted && reg.status === RegistrationStatus.PENDING
        )
        if (!registrationToCancel) {
            throw new BadRequestException('Bạn chưa đăng ký đề tài này hoặc đã bị từ chối')
        }
        registrationToCancel.isDeleted = true
        registrationToCancel.deletedAt = new Date()
        registrationToCancel.status = RegistrationStatus.CANCELED
        // Giảm số lượng sinh viên đã đăng ký
        thesis.registeredStudents = Math.max(0, thesis.registeredStudents - 1)
        return await thesis.save()
    }*/
}
