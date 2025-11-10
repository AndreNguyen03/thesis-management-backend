export enum TopicStatus {
    // Pha 1 - Nộp đề tài
    Draft = 'draft',
    Submitted = 'submitted',
    UnderReview = 'under_review',
    Approved = 'approved',
    Rejected = 'rejected',

    // Pha 2 - Mở đăng ký
    PendingRegistration = 'pending_registration',
    Registered = 'registered',
    Full = 'full',
    Cancelled = 'cancelled',

    // Pha 3 - Thực hiện đề tài
    InProgress = 'in_progress',
    Delayed = 'delayed',
    Paused = 'paused',
    SubmittedForReview = 'submitted_for_review',
    AwaitingEvaluation = 'awaiting_evaluation',

    // Pha 4 - Hoàn tất
    Graded = 'graded',
    Reviewed = 'reviewed',
    Archived = 'archived',
    RejectedFinal = 'rejected_final',
}
