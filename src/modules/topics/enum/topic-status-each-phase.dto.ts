// Phase 1 - Nộp đề tài
export enum TopicPhase1Status {
    Draft = 'draft', // GV
    Submitted = 'submitted', // GV
    UnderReview = 'under_review', // BCN
    Approved = 'approved', // BCN
    Rejected = 'rejected' // BCN
}

// Phase 2 - Mở đăng ký
export enum TopicPhase2Status {
    PendingRegistration = 'pending_registration', // SV
    Registered = 'registered', // SV
    Full = 'full', // SV
    Cancelled = 'cancelled' // SV // khi kết thúc pha
}

// Phase 3 - Thực hiện đề tài
export enum TopicPhase3Status {
    InProgress = 'in_progress', // SV
    Delayed = 'delayed', // SV/GV
    Paused = 'paused', // SV/BCN/GV
    SubmittedForReview = 'submitted_for_review', // SV
    AwaitingEvaluation = 'awaiting_evaluation' // GV
}

// Phase 4 - Hoàn tất
export enum TopicPhase4Status {
    Graded = 'graded', // GV/Hội đồng bảo vệ
    Reviewed = 'reviewed', // BCN
    Archived = 'archived', // BCN
    RejectedFinal = 'rejected_final' // Hội đồng bảo vệ
}
