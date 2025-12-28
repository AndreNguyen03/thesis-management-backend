// Hàm lấy tên pha trước và sau dựa vào tên pha hiện tại
export function getPrevAndNextPhaseName(phase: PeriodPhaseName): { prev?: PeriodPhaseName; next?: PeriodPhaseName } {
    const phaseOrder: PeriodPhaseName[] = [
        PeriodPhaseName.EMPTY,
        PeriodPhaseName.SUBMIT_TOPIC,
        PeriodPhaseName.OPEN_REGISTRATION,
        PeriodPhaseName.EXECUTION,
        PeriodPhaseName.COMPLETION
    ]
    const idx = phaseOrder.indexOf(phase)
    return {
        prev: idx > 0 ? phaseOrder[idx - 1] : undefined,
        next: idx >= 0 && idx < phaseOrder.length - 1 ? phaseOrder[idx + 1] : undefined
    }
}
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
