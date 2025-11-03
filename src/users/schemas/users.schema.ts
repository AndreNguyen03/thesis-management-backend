import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { BaseEntity } from '../../shared/base/entity/base.entity'
import { UserRole } from '../../auth/enum/user-role.enum'

@Schema({ collection: 'users', timestamps: true })
export class User extends BaseEntity {
    @Prop({ required: true, default: '' })
    email: string

    @Prop({ required: true, default: '' })
    password_hash: string

    @Prop({ required: true, default: '' })
    fullName: string

    @Prop({ required: true, default: UserRole.STUDENT, enum: UserRole })
    role: UserRole

    @Prop({ default: '' })
    phone: string

    @Prop({ default: '' })
    bio: string

    @Prop({ default: '' })
    avatarUrl: string

    @Prop({ default: '' })
    avatarName: string

    @Prop({ default: true })
    isActive: boolean
}

export const UserSchema = SchemaFactory.createForClass(User)
