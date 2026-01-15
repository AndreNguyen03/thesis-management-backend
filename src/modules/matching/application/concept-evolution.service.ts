import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import mongoose from 'mongoose'
import { ConceptCandidate, ConceptCandidateStatus } from '../schemas/concept-candidate.schema'
import { Concept } from '../schemas/concept.schema'
import {
    CreateConceptCandidateDto,
    ApproveConceptDto,
    ConceptCandidateResponseDto,
    ConceptCandidateListQueryDto
} from '../dtos/concept-candidate.dto'
import { buildConceptCandidateQueue, suggestParentByKeyword, generateConceptKey } from '../utils/concept-evolution'
import { buildConceptIndex } from '../utils/concept-indexer'
import { plainToInstance } from 'class-transformer'

@Injectable()
export class ConceptEvolutionService {
    private readonly logger = new Logger(ConceptEvolutionService.name)

    constructor(
        @InjectModel(ConceptCandidate.name) private readonly candidateModel: Model<ConceptCandidate>,
        @InjectModel(Concept.name) private readonly conceptModel: Model<Concept>
    ) {}

    /**
     * Detect and queue concept candidates from unmapped tokens
     */
    async detectAndQueueCandidates(
        unmatchedTokensByProfile: Array<{
            profileId: string
            profileType: string
            source: string
            unmatchedTokens: string[]
        }>
    ): Promise<{ created: number; updated: number }> {
        this.logger.log('Detecting concept candidates from unmapped tokens...')

        // Load concept index
        const concepts = await this.conceptModel.find({}).select('key label aliases').lean()
        const conceptIndex = buildConceptIndex(concepts)

        // Build candidate queue
        const candidates = buildConceptCandidateQueue(unmatchedTokensByProfile, conceptIndex)

        this.logger.debug(`Detected ${candidates.length} concept candidates`)

        let created = 0
        let updated = 0

        for (const candidate of candidates) {
            // Check if candidate already exists
            const existing = await this.candidateModel.findOne({ canonical: candidate.canonical })

            if (existing) {
                // Update frequency and examples
                existing.frequency += candidate.frequency
                existing.examples.push(...candidate.examples)
                // Deduplicate examples
                const seen = new Set()
                existing.examples = existing.examples.filter((ex: any) => {
                    const key = `${ex.profileId}-${ex.token}`
                    if (seen.has(key)) return false
                    seen.add(key)
                    return true
                })
                await existing.save()
                updated++
            } else {
                // Suggest parent using keyword matching
                const suggestion = suggestParentByKeyword(candidate.canonical, conceptIndex)

                // Create new candidate
                await this.candidateModel.create({
                    canonical: candidate.canonical,
                    variants: candidate.variants,
                    frequency: candidate.frequency,
                    examples: candidate.examples,
                    suggestedParent: suggestion.parent,
                    suggestedLabel: suggestion.label,
                    suggestedAliases: suggestion.aliases,
                    status: ConceptCandidateStatus.PENDING
                })
                created++
            }
        }

        this.logger.log(`Queued ${created} new candidates, updated ${updated} existing`)

        return { created, updated }
    }

    /**
     * Get all concept candidates with pagination and filtering
     */
    async getCandidates(query: ConceptCandidateListQueryDto): Promise<{
        data: ConceptCandidateResponseDto[]
        total: number
        page: number
        limit: number
    }> {
        const { status, page = 1, limit = 20, sortBy = 'frequency', sortOrder = 'desc' } = query

        const filter: any = {}
        if (status) {
            filter.status = status
        }

        const sort: any = {}
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1

        const skip = (page - 1) * limit

        const [candidates, total] = await Promise.all([
            this.candidateModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
            this.candidateModel.countDocuments(filter)
        ])

        const data = plainToInstance(ConceptCandidateResponseDto, candidates, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })

        return {
            data,
            total,
            page,
            limit
        }
    }

    /**
     * Get single candidate by ID
     */
    async getCandidateById(id: string): Promise<ConceptCandidateResponseDto> {
        const candidate = await this.candidateModel.findById(id).lean()

        if (!candidate) {
            throw new NotFoundException(`Concept candidate ${id} not found`)
        }

        return plainToInstance(ConceptCandidateResponseDto, candidate, {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    /**
     * Approve a concept candidate and add to concepts collection
     */
    async approveCandidate(
        candidateId: string,
        approveDto: ApproveConceptDto,
        userId: string
    ): Promise<ConceptCandidateResponseDto> {
        this.logger.log(`Approving concept candidate ${candidateId}`)

        const candidate = await this.candidateModel.findById(candidateId)

        if (!candidate) {
            throw new NotFoundException(`Concept candidate ${candidateId} not found`)
        }

        if (candidate.status !== ConceptCandidateStatus.PENDING) {
            throw new BadRequestException(`Candidate is already ${candidate.status}`)
        }

        // Check if concept key already exists
        const existingConcept = await this.conceptModel.findOne({ key: approveDto.key })
        if (existingConcept) {
            throw new BadRequestException(`Concept with key ${approveDto.key} already exists`)
        }

        // Create new concept
        await this.conceptModel.create({
            key: approveDto.key,
            label: approveDto.label,
            aliases: approveDto.aliases,
            description: approveDto.description
        })

        // Update candidate status
        candidate.status = ConceptCandidateStatus.APPROVED
        candidate.approvedAt = new Date()
        candidate.approvedBy = new mongoose.Types.ObjectId(userId)
        candidate.approvedConceptKey = approveDto.key
        await candidate.save()

        this.logger.log(`✅ Approved concept: ${approveDto.key} - ${approveDto.label}`)

        return plainToInstance(ConceptCandidateResponseDto, candidate.toObject(), {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    /**
     * Reject a concept candidate
     */
    async rejectCandidate(candidateId: string, reason: string): Promise<ConceptCandidateResponseDto> {
        this.logger.log(`Rejecting concept candidate ${candidateId}`)

        const candidate = await this.candidateModel.findById(candidateId)

        if (!candidate) {
            throw new NotFoundException(`Concept candidate ${candidateId} not found`)
        }

        if (candidate.status !== ConceptCandidateStatus.PENDING) {
            throw new BadRequestException(`Candidate is already ${candidate.status}`)
        }

        candidate.status = ConceptCandidateStatus.REJECTED
        candidate.rejectionReason = reason
        await candidate.save()

        this.logger.log(`❌ Rejected candidate: ${candidate.canonical}`)

        return plainToInstance(ConceptCandidateResponseDto, candidate.toObject(), {
            excludeExtraneousValues: true,
            enableImplicitConversion: true
        })
    }

    /**
     * Delete a rejected candidate
     */
    async deleteCandidate(candidateId: string): Promise<void> {
        const candidate = await this.candidateModel.findById(candidateId)

        if (!candidate) {
            throw new NotFoundException(`Concept candidate ${candidateId} not found`)
        }

        await this.candidateModel.findByIdAndDelete(candidateId)

        this.logger.log(`Deleted concept candidate ${candidateId}`)
    }

    /**
     * Get statistics on concept candidates
     */
    async getStatistics(): Promise<{
        total: number
        pending: number
        approved: number
        rejected: number
        topCandidates: Array<{ canonical: string; frequency: number }>
    }> {
        const [total, pending, approved, rejected, topCandidates] = await Promise.all([
            this.candidateModel.countDocuments(),
            this.candidateModel.countDocuments({ status: ConceptCandidateStatus.PENDING }),
            this.candidateModel.countDocuments({ status: ConceptCandidateStatus.APPROVED }),
            this.candidateModel.countDocuments({ status: ConceptCandidateStatus.REJECTED }),
            this.candidateModel
                .find({ status: ConceptCandidateStatus.PENDING })
                .sort({ frequency: -1 })
                .limit(10)
                .select('canonical frequency')
                .lean()
        ])

        return {
            total,
            pending,
            approved,
            rejected,
            topCandidates: topCandidates.map((c: any) => ({
                canonical: c.canonical,
                frequency: c.frequency
            }))
        }
    }
}
