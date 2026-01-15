import { Injectable, Inject, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import mongoose from 'mongoose'
import { ConfigType } from '@nestjs/config'
import { ChatGroq } from '@langchain/groq'
import { plainToInstance } from 'class-transformer'
import { Concept } from '../schemas/concept.schema'
import { Lecturer } from '../../../users/schemas/lecturer.schema'
import { User } from '../../../users/schemas/users.schema'
import { Student } from '../../../users/schemas/student.schema'
import groqConfig from '../../../config/groq.config'
import { MatchLecturerResponseDto, MatchedLecturerDto } from '../dtos/match-lecturer-response.dto'
import { buildConceptIndex, ConceptIndex } from '../utils/concept-indexer'
import { extractStudentConcepts, extractLecturerConcepts } from '../utils/concept-mapper'
import { matchStudentLecturer, rankMatches } from '../utils/matching-engine'

@Injectable()
export class ProfileMatchingProvider implements OnModuleInit {
    private conceptIndex: ConceptIndex | null = null

    constructor(
        @InjectModel(Concept.name) private readonly conceptModel: Model<Concept>,
        @InjectModel(Lecturer.name) private readonly lecturerModel: Model<Lecturer>,
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @InjectModel(Student.name) private readonly studentModel: Model<Student>,
        @Inject(groqConfig.KEY)
        private readonly groqConfiguration: ConfigType<typeof groqConfig>
    ) {}

    async onModuleInit() {
        console.log('🔄 [MATCHING] Initializing concept index...')
        await this.loadConceptIndex()
    }

    private async loadConceptIndex(): Promise<void> {
        try {
            const concepts = await this.conceptModel.find({}).select('key label aliases').lean()

            if (concepts.length === 0) {
                console.warn('⚠️  [MATCHING] No concepts found in database')
                return
            }

            this.conceptIndex = buildConceptIndex(concepts)
            console.log(`✅ [MATCHING] Loaded ${concepts.length} concepts into index`)
        } catch (error) {
            console.error('❌ [MATCHING] Failed to load concepts:', error)
            throw error
        }
    }

    private getLLM() {
        return new ChatGroq({
            apiKey: this.groqConfiguration.apiKey,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.2,
            maxTokens: 150
        })
    }

    async matchLecturersForStudent(
        userId: string,
        query: string,
        limit: number = 10
    ): Promise<MatchLecturerResponseDto> {
        console.log('🔍 [MATCHING] Starting lecturer matching for user:', userId)

        // Ensure concept index is loaded
        if (!this.conceptIndex) {
            await this.loadConceptIndex()
            if (!this.conceptIndex) {
                throw new Error('Failed to load concept index')
            }
        }

        // B1: Validate student profile
        const student = await this.studentModel.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean()
        if (!student) {
            throw new NotFoundException('Sinh viên không tồn tại')
        }

        const user = await this.userModel.findById(userId).lean()
        const studentBio = user?.bio?.trim() || ''

        // Normalize data
        const skills = Array.isArray(student.skills) ? student.skills.filter(Boolean) : []
        const interests = Array.isArray(student.interests) ? student.interests.filter(Boolean) : []

        const hasProfile = studentBio.length > 0 || skills.length > 0 || interests.length > 0

        if (!hasProfile) {
            throw new BadRequestException('Sinh viên chưa có profile, không thể gợi ý giảng viên')
        }

        console.log('✅ [MATCHING] Student profile found:', { skills, interests, hasBio: !!studentBio })

        // B2: Extract student concepts
        const studentResult = extractStudentConcepts({ skills, interests }, this.conceptIndex)

        if (studentResult.concepts.length === 0) {
            throw new BadRequestException('Không thể trích xuất concepts từ profile sinh viên')
        }

        console.log(`✅ [MATCHING] Extracted ${studentResult.concepts.length} concepts from student`)

        // B3: Get all lecturers with concepts
        const lecturers = await this.lecturerModel.aggregate([
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
                $lookup: {
                    from: 'faculties',
                    localField: 'facultyId',
                    foreignField: '_id',
                    as: 'facultyInfo'
                }
            },
            {
                $unwind: {
                    path: '$facultyInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: '$userInfo._id',
                    fullName: '$userInfo.fullName',
                    email: '$userInfo.email',
                    bio: '$userInfo.bio',
                    title: 1,
                    faculty: {
                        name: '$facultyInfo.name',
                        email: '$facultyInfo.email',
                        urlDirection: '$facultyInfo.urlDirection'
                    },
                    areaInterest: 1,
                    researchInterests: 1,
                    publications: 1
                }
            }
        ])

        if (lecturers.length === 0) {
            throw new NotFoundException('Không tìm thấy giảng viên')
        }

        console.log(`✅ [MATCHING] Found ${lecturers.length} lecturers`)

        // B4: Extract concepts for each lecturer and match
        const matches: Array<{
            lecturer: any
            matchResult: any
        }> = []

        for (const lecturer of lecturers) {
            const lecturerResult = extractLecturerConcepts(lecturer, this.conceptIndex)

            if (lecturerResult.concepts.length === 0) continue

            const matchResult = matchStudentLecturer(studentResult.concepts, lecturerResult.concepts, {
                minDepth: 3,
                minScore: 1.0,
                enableParentBoost: true
            })

            if (matchResult) {
                matches.push({ lecturer, matchResult })
            }
        }

        console.log(`✅ [MATCHING] Found ${matches.length} matches`)

        if (matches.length === 0) {
            throw new NotFoundException('Không tìm thấy giảng viên phù hợp')
        }

        // B5: Rank matches
        const rankedMatches = rankMatches(
            matches.map((m) => ({ ...m, score: m.matchResult.score, conceptCount: m.matchResult.conceptCount })),
            { topN: limit, minScore: 1.0, minConceptCount: 1 }
        )

        // B6: Build profile context
        const profileContext = [
            `Profile sinh viên: Bio "${studentBio}".`,
            skills.length > 0 ? `Skills: ${skills.join(', ')}.` : '',
            interests.length > 0 ? `Interests: ${interests.join(', ')}.` : ''
        ]
            .filter(Boolean)
            .join(' ')

        const profileSummary =
            profileContext.replace(/Profile sinh viên: /, '').substring(0, 150) +
            (profileContext.length > 150 ? '...' : '')

        const llm = this.getLLM()

        // B7: Generate match reasons in parallel
        console.log('🤖 [MATCHING] Generating match reasons with LLM...')

        const formattedLecturers = await Promise.all(
            rankedMatches.map(async (match, idx) => {
                const { lecturer, matchResult } = match as any

                const lecturerContext = [
                    `Tên: ${lecturer.fullName} (${lecturer.title}).`,
                    `Bio: "${lecturer.bio}".`,
                    lecturer.areaInterest?.length > 0 ? `Lĩnh vực: ${lecturer.areaInterest.join(', ')}.` : '',
                    lecturer.researchInterests?.length > 0
                        ? `Nghiên cứu: ${lecturer.researchInterests.join(', ')}.`
                        : ''
                ]
                    .filter(Boolean)
                    .join(' ')

                const reasonPrompt = `Dựa trên profile sinh viên: "${profileContext}"
Và info giảng viên: "${lecturerContext}"
Sinh 1-2 câu reason match tự nhiên (tiếng Việt), nhấn mạnh overlap semantic. Giữ ngắn gọn, thân thiện. Score: ${matchResult.score.toFixed(2)}.`

                let matchReason: string
                try {
                    const reasonResponse = await llm.invoke(reasonPrompt)
                    matchReason = reasonResponse.content.toString().trim()
                } catch (llmError) {
                    console.error('❌ [MATCHING] LLM generate reason error:', llmError)
                    matchReason = `Match dựa trên ${matchResult.conceptCount} concepts chung với điểm ${matchResult.score.toFixed(2)}.`
                }

                return {
                    index: idx + 1,
                    _id: lecturer._id,
                    fullName: lecturer.fullName,
                    email: lecturer.email,
                    bio: lecturer.bio,
                    title: lecturer.title,
                    faculty: lecturer.faculty,
                    areaInterest: lecturer.areaInterest,
                    researchInterests: lecturer.researchInterests,
                    publications: lecturer.publications,
                    score: matchResult.score,
                    coreScore: matchResult.coreScore,
                    boostScore: matchResult.boostScore,
                    conceptCount: matchResult.conceptCount,
                    matchedConcepts: matchResult.matchedConcepts,
                    matchReason
                }
            })
        )

        console.log(`✅ [MATCHING] Successfully matched ${formattedLecturers.length} lecturers`)

        return plainToInstance(
            MatchLecturerResponseDto,
            {
                total: formattedLecturers.length,
                profileSummary,
                lecturers: formattedLecturers
            },
            {
                excludeExtraneousValues: true,
                enableImplicitConversion: true
            }
        )
    }
}
