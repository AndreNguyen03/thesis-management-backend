import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { StudentProfile, StudentProfileSchema } from './student-profile.schema'
import { TeacherProfile, TeacherProfileSchema } from './teacher-profile.schema'

export type UserDocument = HydratedDocument<User>

@Schema({ timestamps: true })
export class User {
    @Prop({ unique: true, required: true })
    username: string

    @Prop({ required: true })
    password_hash: string

    @Prop()
    name: string

    @Prop({ unique: true, required: true })
    email: string

    @Prop()
    fullName: string

    @Prop({ enum: ['student', 'teacher', 'admin'], required: true })
    role: 'student' | 'teacher' | 'admin'

    @Prop({ default: true })
    isActive: boolean

    // profile cho student
    @Prop({ type: StudentProfileSchema })
    studentProfile?: StudentProfile

    // profile cho teacher
    @Prop({ type: TeacherProfileSchema })
    teacherProfile?: TeacherProfile
}

export const UserSchema = SchemaFactory.createForClass(User)
