import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { StudentProfile, StudentProfileSchema } from './student-profile.schema'
import { TeacherProfile, TeacherProfileSchema } from './teacher-profile.schema'
import { BaseEntity } from 'src/shared/base/entity/base.entity'

export type UserDocument = HydratedDocument<User>

export enum USER_ROLE {
    Student = 'student',
    Teacher = 'teacher',
    Admin = 'admin'
}

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})
export class User extends BaseEntity {
    @Prop({ required: true, unique: true })
    username: string

    @Prop({ required: true})
    password_hash: string

    @Prop()
    name: string

    @Prop({ required: true, unique: true })
    email: string

    @Prop()
    fullName: string

    @Prop({
        default: 'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_960_720.png'
    })
    avatar: string

    @Prop({ enum: USER_ROLE, required: true })
    role: USER_ROLE

    @Prop({ default: true })
    isActive: boolean

    @Prop({ type: StudentProfileSchema })
    studentProfile?: StudentProfile

    @Prop({ type: TeacherProfileSchema })
    teacherProfile?: TeacherProfile
}

export const UserSchema = SchemaFactory.createForClass(User)
