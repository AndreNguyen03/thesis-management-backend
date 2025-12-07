import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { User } from '../../../users/schemas/users.schema'
import mongoose from 'mongoose'
export enum NotificationType {
    SYSTEM = 'SYSTEM', // Tin hệ thống (Mở đợt, bảo trì)
    SUCCESS = 'SUCCESS', // Thành công (Được duyệt, Nộp bài xong)
    WARNING = 'WARNING', // Cảnh báo (Sắp hết hạn, Thiếu đề tài)
    ERROR = 'ERROR', // Lỗi/Từ chối (Bị từ chối, Hủy)
    INFO = 'INFO' // Tin thường (Được add vào nhóm)
}
@Schema({
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    },
    collection: 'notifications'
})
export class Notification extends BaseEntity {
    //thông báo cho ai
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true, index: true })
    recipientId: User

    // Người gửi thông báo (Optional - Vì tin hệ thống có thể không có người gửi)
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: false })
    senderId: User

    // Tiêu đề ngắn gọn (VD: "Kết quả đăng ký")
    @Prop({ required: true })
    title: string

    // Nội dung chi tiết (VD: "Giảng viên A đã từ chối yêu cầu...")
    @Prop({ required: true })
    message: string

    // Loại thông báo (để FE render icon)
    @Prop({ type: String, enum: NotificationType, default: NotificationType.INFO })
    type: NotificationType

    @Prop({ type: String, required: false })
    link?: string

    @Prop({ default: false })
    isRead: boolean

    // Metadata: Lưu thêm thông tin phụ nếu cần (VD: ID người gửi, ID đề tài) để xử lý logic
    @Prop({ type: Object, required: false })
    metadata: Record<string, any>
}

export const NotificationSchema = SchemaFactory.createForClass(Notification)
NotificationSchema.index({ recipientId: 1, createdAt: -1 })
