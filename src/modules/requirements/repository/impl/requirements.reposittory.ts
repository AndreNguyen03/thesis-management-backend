import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Requirement } from '../../schemas/requirement.schemas'
import { IRequirementsRepository } from '../requirements.repository.interface'

export class RequirementsRepository extends BaseRepositoryAbstract<Requirement> implements IRequirementsRepository {}
