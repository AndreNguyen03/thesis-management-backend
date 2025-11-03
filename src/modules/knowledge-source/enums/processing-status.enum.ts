export enum ProcessingStatus {
    COMPLETED = 'Completed',
    PENDING = 'Pending',
    FAILED = 'Failed'
}
// "COMPLETED": Đã xử lý xong, vector đã vào database
// "FAILED": Xử lý lỗi (ví dụ: URL die, file hỏng)
// "PENDING": Mới thêm, chờ xử lý
