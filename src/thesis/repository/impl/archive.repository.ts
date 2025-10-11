import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../shared/base/repository/base.repository.abstract'
import { GetThesisResponseDto } from '../../dtos'
import { Archive } from '../../schemas/archive.schemas'
import { ArchiveRepositoryInterface } from '../archive.repository.interface'
import { Model } from 'mongoose'
import { getUserModelFromRole } from '../../utils/get-user-model'
import { Injectable } from '@nestjs/common'
import { ThesisNotArchivedException } from '../../../common/exceptions'
import { GetArchiveDto } from '../../dtos/archive/archive.dto'
import { plainToInstance } from 'class-transformer'
import { Thesis } from '../../schemas/thesis.schemas'

@Injectable()
export class ArchiveRepository extends BaseRepositoryAbstract<Archive> implements ArchiveRepositoryInterface {
    constructor(
        @InjectModel(Archive.name) private readonly archiveRepository: Model<Archive>,
        @InjectModel(Thesis.name) private readonly thesisModel: Model<Thesis> // Inject Thesis model
    ) {
        super(archiveRepository)
    }
    async findSavedThesesByUserId(userId: string, role: string): Promise<GetThesisResponseDto[]> {
        const archive = await this.archiveRepository
            .findOne({ userId: userId, userModel: getUserModelFromRole(role) })
            .populate({
                path: 'savedTheses',
                model: 'Thesis',
                populate: {
                    path: 'registrationIds',
                    select: 'registrantId registrantModel status',
                    populate: { path: 'registrantId', select: '_id fullName role' }
                }
            })
        if (!archive) {
            return []
        }
        const theses = await plainToInstance(GetThesisResponseDto, archive.savedTheses, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
        return theses.map((thesis) => ({
            ...thesis,
            isSaved: true
        }))
    }
    async archiveThesis(userId: string, role: string, thesisId: string): Promise<GetThesisResponseDto> {
        await this.archiveRepository.findOneAndUpdate(
            { userId: userId, userModel: getUserModelFromRole(role) },
            { $addToSet: { savedTheses: thesisId } },
            { upsert: true }
        )

        return _getThesisAfterAction(thesisId, this.thesisModel, true)
    }
    async unarchiveThesis(userId: string, thesisId: string, role: string): Promise<GetThesisResponseDto> {
        await this.archiveRepository.findOneAndUpdate(
            { userId: userId, userModel: getUserModelFromRole(role) },
            { $pull: { savedTheses: thesisId } }
        )
        return _getThesisAfterAction(thesisId, this.thesisModel, false)
    }
}
export const _getThesisAfterAction = async (
    thesisId: string,
    thesisModel: Model<Thesis>,
    isSaved: boolean
): Promise<GetThesisResponseDto> => {
    const thesis = await thesisModel.findOne({ _id: thesisId, deleted_at: null }).populate({
        path: 'registrationIds',
        select: 'registrantId registrantModel status',
        populate: { path: 'registrantId', select: '_id fullName role' }
    })

    const thesisDto = await plainToInstance(GetThesisResponseDto, thesis, {
        excludeExtraneousValues: true,
        enableImplicitConversion: true
    })
    return {
        ...thesisDto,
        isSaved: isSaved
    }
}
