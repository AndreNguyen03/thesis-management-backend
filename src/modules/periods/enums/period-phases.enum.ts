import { EMPTY } from 'rxjs'

export enum PeriodPhaseName {
    EMPTY = 'empty',
    SUBMIT_TOPIC = 'submit_topic',
    OPEN_REGISTRATION = 'open_registration',
    EXECUTION = 'execution',
    COMPLETION = 'completion'
}
export enum PeriodPhaseStatus {
    ONGOING = 'ongoing',
    COMPLETED = 'completed'
}
//đây là trạng thái lưu db để khi query ra biết kì đã xong chưa, còn ongoing mà timout => timeout, còn completed là hoàn thành
//thực tế api trả về sẽ kiểm tra động và cho ra kết quả thuộc ["pending","active","timeout"]

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
