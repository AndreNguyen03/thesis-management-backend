export enum TopicStatus {
    // Pha 1 - Nộp đề tài
    Draft = 'draft', //GV
    Submitted = 'submitted', //GV
    UnderReview = 'under_review', //BCN
    Approved = 'approved', //BCN //đủ điều kiện để sang pha mở đăng ký
    Rejected = 'rejected', //BCN //Từ chối đề tài // đề tài sẽ không đi tiếp sang pha 2

    // Pha 2 - Mở đăng ký
    PendingRegistration = 'pending_registration', //SV //
    Registered = 'registered', //SV
    Full = 'full', //SV
    Cancelled = 'cancelled', //BCN // hệ thống

    // Pha 3 - Thực hiện đề tài
    InProgress = 'in_progress', //SV
    Delayed = 'delayed', //SV hoặc GV thông báo
    Paused = 'paused', // SV BCN GV Đề tài bị tạm ngưng
    SubmittedForReview = 'submitted_for_review', //sv báo cáo hoàn thành / đã nộp vào milestone cuối
    AwaitingEvaluation = 'awaiting_evaluation', //GV vừa duyệt xong và chờ hội đồng chấm điểm

    // Pha 4 - Hoàn tất
    Graded = 'graded', // Gv // Hội đồng bảo vệ
    Reviewed = 'reviewed', //BCN
    Archived = 'archived', //System
    RejectedFinal = 'rejected_final' // Hội đồng bảo vệ
}   


