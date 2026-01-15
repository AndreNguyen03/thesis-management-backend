import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export enum ConceptCandidateStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected'
}

export class ConceptCandidateExample {
    @Prop({ required: true })
    profileId: string

    @Prop({ required: true })
    profileType: string

    @Prop({ required: true })
    source: string

    @Prop({ required: true })
    token: string
}

@Schema({ timestamps: true, collection: 'concept_candidates' })
export class ConceptCandidate extends Document {
    @Prop({ required: true, unique: true, index: true })
    canonical: string

    @Prop({ type: [String], required: true })
    variants: string[]

    @Prop({ required: true, default: 1 })
    frequency: number

    @Prop({ type: [ConceptCandidateExample], required: true })
    examples: ConceptCandidateExample[]

    @Prop()
    suggestedParent?: string

    @Prop()
    suggestedLabel?: string

    @Prop({ type: [String] })
    suggestedAliases?: string[]

    @Prop({
        type: String,
        enum: Object.values(ConceptCandidateStatus),
        default: ConceptCandidateStatus.PENDING,
        index: true
    })
    status: ConceptCandidateStatus

    @Prop()
    approvedAt?: Date

    @Prop({ type: Types.ObjectId, ref: 'User' })
    approvedBy?: Types.ObjectId

    @Prop()
    rejectionReason?: string

    @Prop()
    approvedConceptKey?: string
}

export const ConceptCandidateSchema = SchemaFactory.createForClass(ConceptCandidate)

// Indexes for efficient queries
ConceptCandidateSchema.index({ status: 1, frequency: -1 })
ConceptCandidateSchema.index({ createdAt: -1 })
ConceptCandidateSchema.index({ canonical: 'text', suggestedLabel: 'text' })
