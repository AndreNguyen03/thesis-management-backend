import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

@Schema({ _id: false })
export class ResearchStats {
    @Prop()
    totalProjects: number

    @Prop()
    completedProjects: number

    @Prop()
    excellentProjects: number

    @Prop()
    goodProjects: number

    @Prop()
    averageProjects: number

    @Prop()
    successRate: string
}

export const ResearchStatsSchema = SchemaFactory.createForClass(ResearchStats)
