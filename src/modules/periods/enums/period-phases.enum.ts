import { EMPTY } from 'rxjs'

export enum PeriodPhaseName {
    EMPTY = 'empty',
    SUBMIT_TOPIC = 'submit_topic',
    OPEN_REGISTRATION = 'open_registration',
    EXECUTION = 'execution',
    COMPLETION = 'completion'
}
export enum PeriodPhaseStatus {
    UPCOMING = 'not_started',
    ONGOING = 'ongoing',
    COMPLETED = 'completed'
}
export const ValidateContinuePhase = (currentPhase: string) => {
    const validateClass = {
        empty: [PeriodPhaseName.SUBMIT_TOPIC],
        submit_topic: [PeriodPhaseName.OPEN_REGISTRATION],
        open_registration: [PeriodPhaseName.EXECUTION],
        execution: [PeriodPhaseName.COMPLETION],
        completion: []
    }
    return validateClass[currentPhase]
}
