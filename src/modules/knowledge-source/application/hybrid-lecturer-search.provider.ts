import { Injectable, Inject } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import mongoose from 'mongoose'
import { KnowledgeSource } from '../schemas/knowledge-source.schema'
import { KnowledgeChunk } from '../schemas/knowledge-chunk.schema'
import { Lecturer } from '../../../users/schemas/lecturer.schema'
import { User } from '../../../users/schemas/users.schema'
import { SourceType } from '../enums/source_type.enum'
import { ParsedQuery, QueryParserProvider } from '../../chatbot/providers/query-parser.provider'
import { EnhancedEmbeddingProvider } from '../../chatbot/providers/enhanced-embedding.provider'

export interface LecturerSearchResult {
    _id: string
    fullName: string
    email: string
    bio?: string
    title?: string
    faculty?: {
        name: string
        email: string
        urlDirection?: string
    }
    areaInterest?: string[]
    researchInterests?: string[]
    publications?: Array<{
        title: string
        year?: number
        citations?: number
    }>
    nameMatchScore: number // 0-1: exact name match score
    semanticScore: number // 0-1: semantic similarity score
    finalScore: number // Combined score
    matchType: 'exact-name' | 'fuzzy-name' | 'semantic-only'
}

export interface HybridSearchOptions {
    limit?: number
    semanticWeight?: number // Default 0.6
    nameWeight?: number // Default 0.4
    scoreThreshold?: number // Dynamic based on query type
    useDiversityFilter?: boolean
}

@Injectable()
export class HybridLecturerSearchProvider {
    constructor(
        @InjectModel(KnowledgeSource.name) private readonly knowledgeSourceModel: Model<KnowledgeSource>,
        @InjectModel(KnowledgeChunk.name) private readonly knowledgeChunkModel: Model<KnowledgeChunk>,
        @InjectModel(Lecturer.name) private readonly lecturerModel: Model<Lecturer>,
        @InjectModel(User.name) private readonly userModel: Model<User>,
        private readonly queryParser: QueryParserProvider,
        private readonly embeddingProvider: EnhancedEmbeddingProvider
    ) {}

    /**
     * Main hybrid search entry point
     */
    async search(query: string, options: HybridSearchOptions = {}): Promise<LecturerSearchResult[]> {
        const {
            limit = 10,
            semanticWeight = 0.6,
            nameWeight = 0.4,
            scoreThreshold,
            useDiversityFilter = true
        } = options

        console.log('🔍 [HYBRID SEARCH] Starting search for:', query)

        // Step 1: Parse query
        const parsedQuery = await this.queryParser.parseQuery(query)
        console.log('📝 [HYBRID SEARCH] Parsed query:', {
            names: parsedQuery.personNames,
            concepts: parsedQuery.concepts,
            hasName: parsedQuery.hasNameEntity
        })

        // Step 2: Determine search strategy
        const dynamicThreshold = scoreThreshold || this.getDynamicThreshold(parsedQuery)

        let results: LecturerSearchResult[] = []

        if (parsedQuery.hasNameEntity) {
            // Strategy A: Name-first hybrid search
            results = await this.nameFirstSearch(parsedQuery, {
                limit: limit * 3, // Get more candidates for filtering
                semanticWeight,
                nameWeight,
                scoreThreshold: dynamicThreshold
            })
        } else {
            // Strategy B: Pure semantic search
            results = await this.semanticOnlySearch(parsedQuery, {
                limit: limit * 2,
                scoreThreshold: dynamicThreshold
            })
        }

        console.log(`✅ [HYBRID SEARCH] Found ${results.length} candidates`)

        // Step 3: Apply diversity filter
        if (useDiversityFilter && results.length > limit) {
            results = this.applyDiversityFilter(results, limit)
            console.log(`🌈 [HYBRID SEARCH] After diversity filter: ${results.length} results`)
        }

        // Step 4: Sort by final score and limit
        results.sort((a, b) => b.finalScore - a.finalScore)
        return results.slice(0, limit)
    }

    /**
     * Strategy A: Name-first hybrid search
     * 1. Keyword filter by name
     * 2. Semantic search on filtered pool
     * 3. Merge scores
     */
    private async nameFirstSearch(
        parsed: ParsedQuery,
        options: Required<Omit<HybridSearchOptions, 'useDiversityFilter'>>
    ): Promise<LecturerSearchResult[]> {
        const { limit, semanticWeight, nameWeight, scoreThreshold } = options

        // Phase 1: Keyword filter by name
        const nameMatchedLecturers = await this.findLecturersByName(parsed.personNames)
        console.log(`👤 [NAME SEARCH] Found ${nameMatchedLecturers.length} name matches`)

        if (nameMatchedLecturers.length === 0) {
            // No name matches, fall back to semantic only
            console.log('⚠️ [NAME SEARCH] No name matches, falling back to semantic search')
            return await this.semanticOnlySearch(parsed, { limit, scoreThreshold })
        }

        // Phase 2: Get knowledge source IDs for name-matched lecturers
        const lecturerUserIds = nameMatchedLecturers.map((l) => l.userId.toString())
        const knowledgeSources = await this.knowledgeSourceModel
            .find({
                source_type: SourceType.LECTURER_PROFILE,
                source_location: { $in: lecturerUserIds }
            })
            .select('_id source_location')
            .lean()

        const sourceIdToUserId = new Map(
            knowledgeSources.map((ks) => [ks._id.toString(), ks.source_location.toString()])
        )

        // Phase 3: Semantic search on filtered pool
        const queryVector = await this.embeddingProvider.embedParsedQuery(parsed)

        // Ensure limit <= numCandidates (MongoDB requirement)
        const numCandidates = Math.min(knowledgeSources.length * 10, 500)
        const searchLimit = Math.min(limit * 2, numCandidates)

        const semanticResults = await this.knowledgeChunkModel.aggregate([
            {
                $vectorSearch: {
                    index: 'search_knowledge_chunk',
                    path: 'plot_embedding_gemini_large',
                    queryVector: queryVector,
                    numCandidates: numCandidates,
                    limit: searchLimit,
                    filter: {
                        source_id: { $in: knowledgeSources.map((ks) => ks._id) }
                    }
                }
            },
            {
                $addFields: {
                    score: { $meta: 'vectorSearchScore' }
                }
            },
            {
                $match: {
                    score: { $gte: scoreThreshold * 0.7 } // Lower threshold for name-matched
                }
            }
        ])

        console.log(`🔬 [SEMANTIC SEARCH] Found ${semanticResults.length} semantic matches`)

        // Phase 4: Merge scores
        const mergedResults = await this.mergeNameAndSemanticScores(
            nameMatchedLecturers,
            semanticResults,
            sourceIdToUserId,
            parsed.personNames,
            { semanticWeight, nameWeight }
        )

        return mergedResults.filter((r) => r.finalScore >= scoreThreshold)
    }

    /**
     * Strategy B: Pure semantic search (no name entities)
     */
    private async semanticOnlySearch(
        parsed: ParsedQuery,
        options: { limit: number; scoreThreshold: number }
    ): Promise<LecturerSearchResult[]> {
        const { limit, scoreThreshold } = options

        // Semantic search with concept-focused embedding
        const queryVector = await this.embeddingProvider.embedParsedQuery(parsed)

        // Ensure limit <= numCandidates (MongoDB requirement)
        const numCandidates = limit * 10
        const searchLimit = Math.min(limit * 2, numCandidates)

        const semanticResults = await this.knowledgeChunkModel.aggregate([
            {
                $vectorSearch: {
                    index: 'search_knowledge_chunk',
                    path: 'plot_embedding_gemini_large',
                    queryVector: queryVector,
                    numCandidates: numCandidates,
                    limit: searchLimit
                }
            },
            {
                $addFields: {
                    score: { $meta: 'vectorSearchScore' }
                }
            },
            {
                $match: {
                    score: { $gte: scoreThreshold }
                }
            },
            {
                $lookup: {
                    from: 'knowledge_sources',
                    localField: 'source_id',
                    foreignField: '_id',
                    as: 'source'
                }
            },
            {
                $unwind: '$source'
            },
            {
                $match: {
                    'source.source_type': SourceType.LECTURER_PROFILE,
                    'source.status': 'ENABLED'
                }
            }
        ])

        console.log(`🔬 [SEMANTIC SEARCH] Found ${semanticResults.length} semantic matches`)

        // Map to lecturer details
        const userIds = semanticResults.map((r) => new mongoose.Types.ObjectId(r.source.source_location))
        const lecturers = await this.getLecturerDetailsByUserIds(userIds)

        // Build results with semantic score only
        return lecturers.map((lecturer) => {
            const matchingChunk = semanticResults.find(
                (r) => r.source.source_location === (lecturer as any).userId.toString()
            )

            const semanticScore = matchingChunk?.score || 0

            return {
                ...lecturer,
                nameMatchScore: 0,
                semanticScore: semanticScore,
                finalScore: semanticScore,
                matchType: 'semantic-only' as const
            }
        })
    }

    /**
     * Find lecturers by name (exact + fuzzy matching)
     */
    private async findLecturersByName(names: string[]): Promise<any[]> {
        if (names.length === 0) return []

        const results: any[] = []

        for (const name of names) {
            // Exact match
            const exactMatches = await this.userModel
                .find({
                    fullName: { $regex: new RegExp(`^${name}$`, 'i') }
                })
                .lean()

            results.push(...exactMatches.map((u) => ({ ...u, nameMatchType: 'exact', matchScore: 1.0 })))

            // Fuzzy match (each word must appear)
            const words = name.split(/\s+/)
            const fuzzyRegex = words.map((w) => `(?=.*${w})`).join('')
            const fuzzyMatches = await this.userModel
                .find({
                    fullName: { $regex: new RegExp(fuzzyRegex, 'i') },
                    _id: { $nin: exactMatches.map((u) => u._id) } // Exclude exact matches
                })
                .lean()

            results.push(...fuzzyMatches.map((u) => ({ ...u, nameMatchType: 'fuzzy', matchScore: 0.7 })))
        }

        // Get lecturer details
        const userIds = results.map((r) => r._id)
        const lecturers = await this.lecturerModel.find({ userId: { $in: userIds } }).lean()

        return results.map((user) => {
            const lecturer = lecturers.find((l) => l.userId.toString() === user._id.toString())
            return {
                userId: user._id,
                fullName: user.fullName,
                nameMatchScore: user.matchScore,
                nameMatchType: user.nameMatchType,
                lecturerId: lecturer?._id
            }
        })
    }

    /**
     * Merge name match scores and semantic scores
     */
    private async mergeNameAndSemanticScores(
        nameMatches: any[],
        semanticResults: any[],
        sourceIdToUserId: Map<string, string>,
        queryNames: string[],
        weights: { semanticWeight: number; nameWeight: number }
    ): Promise<LecturerSearchResult[]> {
        // Build userId to semantic score map
        const userIdToSemanticScore = new Map<string, number>()
        semanticResults.forEach((r) => {
            const userId = sourceIdToUserId.get(r.source_id.toString())
            if (userId) {
                const existingScore = userIdToSemanticScore.get(userId) || 0
                userIdToSemanticScore.set(userId, Math.max(existingScore, r.score))
            }
        })

        // Normalize semantic scores (0-1 range)
        const maxSemanticScore = Math.max(...Array.from(userIdToSemanticScore.values()), 0.001)
        userIdToSemanticScore.forEach((score, userId) => {
            userIdToSemanticScore.set(userId, score / maxSemanticScore)
        })

        // Get lecturer details
        const userIds = nameMatches.map((nm) => nm.userId)
        const lecturers = await this.getLecturerDetailsByUserIds(userIds)

        // Merge scores
        return lecturers.map((lecturer) => {
            const userId = (lecturer as any).userId.toString()
            const nameMatch = nameMatches.find((nm) => nm.userId.toString() === userId)
            const nameMatchScore = nameMatch?.nameMatchScore || 0
            const semanticScore = userIdToSemanticScore.get(userId) || 0

            // Calculate final score
            const finalScore = nameMatchScore * weights.nameWeight + semanticScore * weights.semanticWeight

            // Determine match type
            let matchType: 'exact-name' | 'fuzzy-name' | 'semantic-only'
            if (nameMatch?.nameMatchType === 'exact') {
                matchType = 'exact-name'
            } else if (nameMatch?.nameMatchType === 'fuzzy') {
                matchType = 'fuzzy-name'
            } else {
                matchType = 'semantic-only'
            }

            return {
                ...lecturer,
                nameMatchScore,
                semanticScore,
                finalScore,
                matchType
            }
        })
    }

    /**
     * Get lecturer details by user IDs
     */
    private async getLecturerDetailsByUserIds(userIds: mongoose.Types.ObjectId[]): Promise<any[]> {
        const lecturers = await this.lecturerModel.aggregate([
            {
                $match: {
                    userId: { $in: userIds }
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
                    userId: '$userId',
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

        return lecturers
    }

    /**
     * Determine dynamic score threshold based on query characteristics
     */
    private getDynamicThreshold(parsed: ParsedQuery): number {
        if (parsed.hasNameEntity) {
            // Name queries: lower threshold to allow more semantic matches
            return 0.6
        }

        const wordCount = parsed.concepts.length

        if (wordCount <= 2) {
            // Short concept queries: balanced threshold
            return 0.65
        }

        if (wordCount <= 5) {
            // Medium queries: standard threshold
            return 0.7
        }

        // Long specific queries: higher threshold
        return 0.75
    }

    /**
     * Apply diversity filter (MMR - Maximal Marginal Relevance)
     * Prevents returning many lecturers with same name or similar profiles
     */
    private applyDiversityFilter(results: LecturerSearchResult[], targetCount: number): LecturerSearchResult[] {
        if (results.length <= targetCount) return results

        const selected: LecturerSearchResult[] = [results[0]] // Always include top result
        const remaining = [...results.slice(1)]

        while (selected.length < targetCount && remaining.length > 0) {
            let maxMMR = -Infinity
            let bestIdx = 0

            remaining.forEach((candidate, idx) => {
                // Relevance score
                const relevance = candidate.finalScore

                // Max similarity to already selected
                const maxSim = Math.max(...selected.map((s) => this.calculateSimilarity(candidate, s)))

                // MMR score (lambda = 0.7 for balance between relevance and diversity)
                const mmr = 0.7 * relevance - 0.3 * maxSim

                if (mmr > maxMMR) {
                    maxMMR = mmr
                    bestIdx = idx
                }
            })

            selected.push(remaining[bestIdx])
            remaining.splice(bestIdx, 1)
        }

        return selected
    }

    /**
     * Calculate similarity between two lecturers
     */
    private calculateSimilarity(lec1: LecturerSearchResult, lec2: LecturerSearchResult): number {
        let similarity = 0

        // Name similarity (high weight)
        if (this.queryParser.areNamesSimilar(lec1.fullName, lec2.fullName, 0.7)) {
            similarity += 0.5
        }

        // Research interest overlap
        const interests1 = new Set(lec1.researchInterests || [])
        const interests2 = new Set(lec2.researchInterests || [])
        const interestIntersection = [...interests1].filter((i) => interests2.has(i)).length
        const interestUnion = new Set([...interests1, ...interests2]).size
        if (interestUnion > 0) {
            similarity += 0.3 * (interestIntersection / interestUnion)
        }

        // Area of interest overlap
        const areas1 = new Set(lec1.areaInterest || [])
        const areas2 = new Set(lec2.areaInterest || [])
        const areaIntersection = [...areas1].filter((a) => areas2.has(a)).length
        const areaUnion = new Set([...areas1, ...areas2]).size
        if (areaUnion > 0) {
            similarity += 0.2 * (areaIntersection / areaUnion)
        }

        return similarity
    }
}
