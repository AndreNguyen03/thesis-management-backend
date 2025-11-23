import { Injectable } from '@nestjs/common'
import { PeriodPhaseName } from '../enums/period-phases.enum'
import { Period } from '../schemas/period.schemas'

@Injectable()
export class ValidatePeriodPhaseProvider {
    async validateStatusManualTransition(currentPhase: string, newPhase: string): Promise<boolean> {
        console.log('Validating transition from', currentPhase, 'to', newPhase)
        const validTransitions = {
            empty: [PeriodPhaseName.SUBMIT_TOPIC],
            submit_topic: [PeriodPhaseName.OPEN_REGISTRATION],
            open_registration: [PeriodPhaseName.EXECUTION],
            execution: [PeriodPhaseName.COMPLETION],
            completion: []
        }
        return validTransitions[currentPhase]?.includes(newPhase) ?? false
    }
}
