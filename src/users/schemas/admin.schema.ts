import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { BaseEntity } from 'src/shared/base/entity/base.entity'

export type AdminDocument = HydratedDocument<Admin>

@Schema({ collection: 'admins', timestamps: true })
export class Admin extends BaseEntity {
    @Prop({ required: true, default: '' }) fullName: string
    @Prop({ required: true, default: '' }) email: string
    @Prop({ required: true, default: '' }) password_hash: string
    @Prop({ default: true }) isActive: boolean
    @Prop({ default: 'admin' }) role: 'admin'
}

export const AdminSchema = SchemaFactory.createForClass(Admin)
