import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { BaseEntity } from '../../shared/base/entity/base.entity'
import { User } from './users.schema'

export type AdminDocument = HydratedDocument<Admin>

@Schema({ collection: 'admins', timestamps: true })
export class Admin extends User {}

export const AdminSchema = SchemaFactory.createForClass(Admin)
