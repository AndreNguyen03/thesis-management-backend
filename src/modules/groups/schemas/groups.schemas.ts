// schemas/conversation.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose, { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose'
import { BaseEntity } from '../../../shared/base/entity/base.entity'
import { User } from '../../../users/schemas/users.schema'
import { File } from '../../upload-files/schemas/upload-files.schemas'

export type GroupDocument = HydratedDocument<Group>

// Sub-document cho LastMessage (Embed trực tiếp)
@Schema({ _id: false })
class LastMessage {
    @Prop({ type: String })
    content: string

    @Prop({ type: Types.ObjectId, ref: User.name })
    senderId: Types.ObjectId

    @Prop({ type: Date, default: Date.now })
    createdAt: Date
}

@Schema({ timestamps: true, collection: 'groups' })
export class Group extends BaseEntity {
    @Prop({ type: Types.ObjectId, ref: 'Topic', required: true, index: true })
    topicId: Types.ObjectId

    @Prop({ enum: ['direct', 'group'], required: true })
    type: string

    @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
    participants: Types.ObjectId[]

    // Pattern: Subset - Giúp render UI danh sách chat cực nhanh
    @Prop({ type: LastMessage })
    lastMessage: LastMessage

    // Pattern: Attribute Pattern - Lưu unread count dạng Map để truy xuất O(1)
    // Key: UserId, Value: Số tin chưa đọc
    @Prop({ type: Map, of: Number, default: {} })
    unreadCounts: Map<string, number>

}

export const GroupSchema = SchemaFactory.createForClass(Group)
// Index tối ưu cho việc sort conversation theo tin nhắn mới nhất
GroupSchema.index({ topicId: 1, 'lastMessage.createdAt': -1 })
