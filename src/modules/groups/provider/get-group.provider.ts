import { Inject, Injectable } from '@nestjs/common'
import { IGroupRepository } from '../repository/groups.repository.interface'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'

@Injectable()
export class GetGroupProvider {
    constructor(@Inject('IGroupRepository') private readonly groupRepository: IGroupRepository) {}
    async getGroupIdsByPeriodId(periodId: string, phaseName: PeriodPhaseName): Promise<string[]> {
        return await this.groupRepository.getGroupIdsByPeriodId(periodId, phaseName)
    }
}
