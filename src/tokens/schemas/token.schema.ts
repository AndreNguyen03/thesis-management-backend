import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose'
import { BaseEntity } from 'src/shared/base/entity/base.entity'

export type UserTokenDocument = HydratedDocument<UserToken>

export type UserRole = 'student' | 'lecturer' | 'admin'

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
export class UserToken extends BaseEntity {
    @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
    userId: string // ObjectId ở dạng string cho dễ serialize

    @Prop({ required: true })
    refreshToken: string

    // thêm deviceId để phân biệt từng session/device
    @Prop({ required: true })
    deviceId: string // UUID sinh khi login

    @Prop()
    deviceInfo?: string // Ví dụ: "Chrome - Windows 11"

    @Prop({ default: true })
    isValid: boolean

    @Prop()
    ipAddress?: string

    @Prop()
    expiresAt?: Date // thời gian refresh token hết hạn
}

export const UserTokenSchema = SchemaFactory.createForClass(UserToken)
