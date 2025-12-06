import { RejectionReasonType } from '../../modules/registrations/schemas/ref_students_topics.schemas'

export function getRejectionReasonText(reason: RejectionReasonType): string {
    switch (reason) {
        case RejectionReasonType.FULL_SLOT:
            return 'Đã đủ số lượng thành viên'
        case RejectionReasonType.SKILL_MISMATCH:
            return 'Kỹ năng chưa phù hợp'
        case RejectionReasonType.GPA_LOW:
            return 'Điểm trung bình chưa đạt yêu cầu'
        case RejectionReasonType.OTHER:
            return 'Lý do khác'
        default:
            return ''
    }
}
