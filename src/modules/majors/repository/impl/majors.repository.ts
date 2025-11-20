import {  Injectable } from '@nestjs/common'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Major } from '../../schemas/majors.schemas'
import { IMajorRepository } from '../majors.repository.interface'
import { Model } from 'mongoose'
import { InjectModel } from '@nestjs/mongoose'
@Injectable()
export class MajorsRepository extends BaseRepositoryAbstract<Major> implements IMajorRepository {
    constructor(@InjectModel(Major.name) private readonly majorModel: Model<Major>) {
        super(majorModel)
    }
}
