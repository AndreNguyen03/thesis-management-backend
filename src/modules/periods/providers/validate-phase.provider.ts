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

    async validatePhaseDates(
        periodId: string,
        phaseName: string,
        startTime: Date,
        endTime: Date,
        period?: Period // nếu đã tìm trước đó thì không cần tìm lại
    ): Promise<boolean> {
        // Lấy các pha hiện có trong kỳ
        return false
    }
    async validateActionInPhase(currentPhase: string, action: string): Promise<boolean> {
        const phaseActions = {
            empty: [],
            submit_topic: ['submit_topic', 'approve_topic', 'reject_topic'],
            open_registration: ['register_topic', 'deregister_topic'],
            execution: ['work_on_topic', 'submit_report'],
            completion: ['finalize_topic']
        }
        return phaseActions[currentPhase]?.includes(action) ?? false
    }
}
