import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

@Schema({ timestamps: true })
export class UserToken extends Document {
    @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
    userId: Types.ObjectId

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
