import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

@Schema({ _id: false })
export class StudentProfile {
    @Prop()
    year: number

    @Prop([String])
    majorSubjects: string[]

    @Prop([String])
    skills: string[]

    @Prop([String])
    careerOrientation: string[]

    @Prop()
    gpa: number
}

export const StudentProfileSchema = SchemaFactory.createForClass(StudentProfile)
