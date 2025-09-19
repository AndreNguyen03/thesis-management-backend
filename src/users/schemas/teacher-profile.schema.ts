import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ResearchStats, ResearchStatsSchema } from './research-stats.schema'
import { PublishedResearch, PublishedResearchSchema } from './published-research.schema'
import { TeacherCompletedProject, TeacherCompletedProjectSchema } from './teacher-completed-project.schema'
import { TeacherOngoingProject, TeacherOngoingProjectSchema } from './teacher-ongoing-project.schema'

@Schema({ _id: false })
export class TeacherProfile {
    @Prop()
    title: string

    @Prop()
    department: string

    @Prop()
    university: string

    @Prop()
    phone: string

    @Prop()
    officeLocation: string

    @Prop([String])
    expertise: string[]

    @Prop({ type: ResearchStatsSchema })
    researchStats: ResearchStats

    @Prop({ type: [PublishedResearchSchema], default: [] })
    publishedResearch: PublishedResearch[]

    @Prop({ type: [TeacherOngoingProjectSchema], default: [] })
    ongoingProjects: TeacherOngoingProject[]

    @Prop({ type: [TeacherCompletedProjectSchema], default: [] })
    completedProjects: TeacherCompletedProject[]
}

export const TeacherProfileSchema = SchemaFactory.createForClass(TeacherProfile)
