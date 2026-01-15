import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import mongoose from 'mongoose'
import { Student } from '../../../users/schemas/student.schema'
import { Lecturer } from '../../../users/schemas/lecturer.schema'
import { User } from '../../../users/schemas/users.schema'
import { Concept } from '../schemas/concept.schema'
import { ConceptEvolutionService } from './concept-evolution.service'
import { extractStudentConcepts, extractLecturerConcepts } from '../utils/concept-mapper'
import { buildConceptIndex } from '../utils/concept-indexer'

@Injectable()
export class ConceptDetectionJob implements OnModuleInit {
    private readonly logger = new Logger(ConceptDetectionJob.name)
    private isRunning = false

    constructor(
        @InjectModel(Student.name) private readonly studentModel: Model<Student>,
        @InjectModel(Lecturer.name) private readonly lecturerModel: Model<Lecturer>,
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @InjectModel(Concept.name) private readonly conceptModel: Model<Concept>,
        private readonly evolutionService: ConceptEvolutionService
    ) {}

    async onModuleInit() {
        this.logger.log('ConceptDetectionJob initialized')
        // Run once on startup (optional)
        // await this.detectConceptsFromRecentProfiles()
    }

    /**
     * Cron job: Run every day at 2 AM
     */
    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async detectConceptsFromRecentProfiles() {
        if (this.isRunning) {
            this.logger.warn('Concept detection job already running, skipping...')
            return
        }

        this.isRunning = true
        this.logger.log('🔍 Starting concept detection job...')

        try {
            const startTime = Date.now()

            // Load concept index
            const concepts = await this.conceptModel.find({}).select('key label aliases').lean()
            const conceptIndex = buildConceptIndex(concepts)

            // Get recent profiles (updated in last 7 days)
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

            // Extract from students
            const studentUnmatched = await this.extractFromStudents(sevenDaysAgo, conceptIndex)

            // Extract from lecturers
            const lecturerUnmatched = await this.extractFromLecturers(sevenDaysAgo, conceptIndex)

            const allUnmatched = [...studentUnmatched, ...lecturerUnmatched]

            if (allUnmatched.length === 0) {
                this.logger.log('No unmapped tokens found in recent profiles')
                return
            }

            // Detect and queue candidates
            const result = await this.evolutionService.detectAndQueueCandidates(allUnmatched)

            const duration = Date.now() - startTime
            this.logger.log(
                `✅ Concept detection completed in ${duration}ms: ${result.created} new, ${result.updated} updated`
            )
        } catch (error) {
            this.logger.error(`❌ Concept detection job failed: ${error.message}`, error.stack)
        } finally {
            this.isRunning = false
        }
    }

    /**
     * Extract unmapped tokens from recent student profiles
     */
    private async extractFromStudents(since: Date, conceptIndex: any) {
        const students = await this.studentModel
            .find({
                updatedAt: { $gte: since },
                $or: [{ skills: { $exists: true, $ne: [] } }, { interests: { $exists: true, $ne: [] } }]
            })
            .select('userId skills interests updatedAt')
            .lean()

        const unmatchedByProfile: Array<{
            profileId: string
            profileType: string
            source: string
            unmatchedTokens: string[]
        }> = []

        for (const student of students) {
            const skills = Array.isArray(student.skills) ? student.skills.filter(Boolean) : []
            const interests = Array.isArray(student.interests) ? student.interests.filter(Boolean) : []

            if (skills.length === 0 && interests.length === 0) continue

            const result = extractStudentConcepts({ skills, interests }, conceptIndex)

            if (result.unmatchedTokens.length > 0) {
                unmatchedByProfile.push({
                    profileId: student.userId.toString(),
                    profileType: 'student',
                    source: 'skills,interests',
                    unmatchedTokens: result.unmatchedTokens
                })
            }
        }

        this.logger.debug(
            `Extracted from ${students.length} students, ${unmatchedByProfile.length} with unmapped tokens`
        )

        return unmatchedByProfile
    }

    /**
     * Extract unmapped tokens from recent lecturer profiles
     */
    private async extractFromLecturers(since: Date, conceptIndex: any) {
        const lecturers = await this.lecturerModel.aggregate([
            {
                $match: {
                    updatedAt: { $gte: since },
                    $or: [
                        { areaInterest: { $exists: true, $ne: [] } },
                        { researchInterests: { $exists: true, $ne: [] } }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $unwind: {
                    path: '$userInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: '$userInfo._id',
                    bio: '$userInfo.bio',
                    areaInterest: 1,
                    researchInterests: 1,
                    updatedAt: 1
                }
            }
        ])

        const unmatchedByProfile: Array<{
            profileId: string
            profileType: string
            source: string
            unmatchedTokens: string[]
        }> = []

        for (const lecturer of lecturers) {
            const result = extractLecturerConcepts(lecturer, conceptIndex)

            if (result.unmatchedTokens.length > 0) {
                unmatchedByProfile.push({
                    profileId: lecturer._id.toString(),
                    profileType: 'lecturer',
                    source: 'areaInterest,researchInterests',
                    unmatchedTokens: result.unmatchedTokens
                })
            }
        }

        this.logger.debug(
            `Extracted from ${lecturers.length} lecturers, ${unmatchedByProfile.length} with unmapped tokens`
        )

        return unmatchedByProfile
    }

    /**
     * Manual trigger for testing
     */
    async triggerManually() {
        this.logger.log('Manually triggering concept detection job...')
        return this.detectConceptsFromRecentProfiles()
    }
}
