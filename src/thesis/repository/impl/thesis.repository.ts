import { ThesisRepositoryInterface } from '../thesis.repository.interface'
import { Thesis } from '../../schemas/thesis.schemas'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import mongoose, { Model } from 'mongoose'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { GetThesisResponseDto } from '../../dtos'
import { plainToInstance } from 'class-transformer'
import { Archive } from '../../schemas/archive.schemas'
import { getUserModelFromRole } from '../../utils/get-user-model'

export class ThesisRepository extends BaseRepositoryAbstract<Thesis> implements ThesisRepositoryInterface {
    public constructor(
        @InjectModel(Thesis.name)
        private readonly thesisRepository: Model<Thesis>,
        @InjectModel(Archive.name) private readonly archiveRepository: Model<Archive>
    ) {
        super(thesisRepository)
    }
    async getAllTheses(userId: string, role: string): Promise<GetThesisResponseDto[]> {
        const userArchive = await this.archiveRepository
            .findOne({ userId: new mongoose.Types.ObjectId(userId), userModel: getUserModelFromRole(role) })
            .select('savedTheses')
            .lean()
        const savedThesesIds = userArchive ? userArchive.savedTheses.map((id) => id.toString()) : []

        const theses = await this.thesisRepository
            .find({ deleted_at: null })
            .populate({
                path: 'registrationIds',
                select: 'registrantId registrantModel status',
                populate: { path: 'registrantId', select: '_id fullName role' }
            })
            .lean()
            .exec()
        const thesesWithSavedStatus = theses.map((thesis) => ({
            ...thesis,
            isSaved: savedThesesIds.includes(thesis._id.toString())
        }))
        const res = plainToInstance(GetThesisResponseDto, thesesWithSavedStatus, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
        return res
    }

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
}
