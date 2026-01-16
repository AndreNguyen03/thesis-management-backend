import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Concept } from '../schemas/concept.schema'
import { normalizeText, cosineSimilarity, generateNGrams, tokenize, preprocessText } from '../utils/text-processor.util'
import { GetEmbeddingProvider } from '../../chatbot/providers/get-embedding.provider'
import { TrieIndex, buildTrieIndex } from '../utils/trie-index.util'

// Type for lean document (plain JavaScript object)
type ConceptDoc = {
    _id?: any
    key: string
    label: string
    aliases: string[]
    depth: number
    embedding?: number[]
}

export interface ConceptMatch {
    concept: ConceptDoc
    score: number
    matchType: 'exact' | 'alias' | 'embedding' | 'trie'
    matchedText: string
}

@Injectable()
export class ConceptMatcherService implements OnModuleInit {
    private readonly logger = new Logger(ConceptMatcherService.name)
    private readonly EMBEDDING_SIMILARITY_THRESHOLD = 0.7
    private readonly ALIAS_MATCH_THRESHOLD = 0.9
    
    // Trie index for fast alias matching
    private trieIndex: TrieIndex | null = null
    private conceptCache: Map<string, ConceptDoc> = new Map()

    constructor(
        @InjectModel(Concept.name)
        private readonly conceptModel: Model<Concept>,
        private readonly getEmbeddingProvider: GetEmbeddingProvider
    ) {}

    /**
     * Build Trie index on module initialization
     */
    async onModuleInit() {
        await this.buildTrieIndex()
    }

    /**
     * Build or rebuild Trie index from database concepts
     */
    async buildTrieIndex(): Promise<void> {
        const startTime = Date.now()
        this.logger.log('Building Trie index from concepts...')

        const concepts = await this.conceptModel.find().lean<ConceptDoc[]>().exec()
        
        // Build cache
        this.conceptCache.clear()
        concepts.forEach(concept => {
            this.conceptCache.set(concept.key, concept)
        })

        // Build Trie
        this.trieIndex = buildTrieIndex(concepts, preprocessText)
        
        const stats = this.trieIndex.getStats()
        const duration = Date.now() - startTime
        
        this.logger.log(
            `Trie index built: ${stats.totalConcepts} concepts, ` +
            `${stats.totalNodes} nodes, took ${duration}ms`
        )
    }

    /**
     * Match a single text against concepts using Trie index
     * Pipeline:
     * 1. Try exact match with Trie (O(L) instead of O(m))
     * 2. Try fuzzy token match with Trie
     * 3. Try embedding similarity (fallback)
     */
    async matchText(text: string): Promise<ConceptMatch | null> {
        const normalized = normalizeText(text)

        if (!normalized) {
            return null
        }

        // Use Trie if available
        if (this.trieIndex) {
            return this.matchTextWithTrie(text, normalized)
        }

        // Fallback to original method
        return this.matchTextLegacy(text, normalized)
    }

    /**
     * Match text using Trie index (fast path)
     */
    private matchTextWithTrie(originalText: string, normalizedText: string): ConceptMatch | null {
        const processed = preprocessText(originalText)

        // Step 1: Try exact match in Trie (O(L))
        const exactMatches = this.trieIndex!.searchExact(processed)
        if (exactMatches.length > 0) {
            const concept = this.conceptCache.get(exactMatches[0].conceptKey)
            if (concept) {
                this.logger.debug(`Trie exact match for "${originalText}": ${concept.key}`)
                return {
                    concept,
                    score: 1.0,
                    matchType: 'trie',
                    matchedText: exactMatches[0].matchedAlias
                }
            }
        }

        // Step 2: Try fuzzy token matching in Trie
        const fuzzyMatches = this.trieIndex!.searchFuzzyTokens(processed)
        if (fuzzyMatches.length > 0 && fuzzyMatches[0].score >= 0.6) {
            const concept = this.conceptCache.get(fuzzyMatches[0].conceptKey)
            if (concept) {
                this.logger.debug(
                    `Trie fuzzy match for "${originalText}": ${concept.key} ` +
                    `(score: ${fuzzyMatches[0].score.toFixed(2)})`
                )
                return {
                    concept,
                    score: fuzzyMatches[0].score,
                    matchType: 'trie',
                    matchedText: fuzzyMatches[0].matchedAlias
                }
            }
        }

        // Step 3: Try substring matching in Trie
        const substringMatches = this.trieIndex!.searchSubstring(processed)
        if (substringMatches.length > 0 && substringMatches[0].score >= 0.7) {
            const concept = this.conceptCache.get(substringMatches[0].conceptKey)
            if (concept) {
                this.logger.debug(
                    `Trie substring match for "${originalText}": ${concept.key} ` +
                    `(score: ${substringMatches[0].score.toFixed(2)})`
                )
                return {
                    concept,
                    score: substringMatches[0].score,
                    matchType: 'trie',
                    matchedText: substringMatches[0].matchedAlias
                }
            }
        }

        this.logger.debug(`No Trie match found for "${originalText}"`)
        return null
    }

    /**
     * Legacy matching method (fallback when Trie not available)
     */
    private async matchTextLegacy(originalText: string, normalizedText: string): Promise<ConceptMatch | null> {

        if (!normalizedText) {
            return null
        }

        // Step 1: Try exact match with concept labels
        const exactMatch = await this.findExactMatch(normalizedText)
        if (exactMatch) {
            this.logger.debug(`Exact match found for "${originalText}": ${exactMatch.key}`)
            return {
                concept: exactMatch,
                score: 1.0,
                matchType: 'exact',
                matchedText: originalText
            }
        }

        // Step 2: Try alias match
        const aliasMatch = await this.findAliasMatch(normalizedText)
        if (aliasMatch) {
            this.logger.debug(`Alias match found for "${originalText}": ${aliasMatch.key}`)
            return {
                concept: aliasMatch,
                score: 0.95,
                matchType: 'alias',
                matchedText: originalText
            }
        }

        // Step 3: Try embedding similarity (if embeddings exist)
        const embeddingMatch = await this.findEmbeddingMatch(originalText)
        if (embeddingMatch) {
            this.logger.debug(
                `Embedding match found for "${originalText}": ${embeddingMatch.concept.key} (score: ${embeddingMatch.score})`
            )
            return embeddingMatch
        }

        this.logger.debug(`No match found for "${originalText}"`)
        return null
    }

    /**
     * Match multiple texts against concepts
     */
    async matchTexts(texts: string[]): Promise<ConceptMatch[]> {
        const matches: ConceptMatch[] = []
        const uniqueTexts = [...new Set(texts.filter((t) => t && t.trim()))]

        for (const text of uniqueTexts) {
            const match = await this.matchText(text)
            if (match) {
                matches.push(match)
            }
        }

        // Remove duplicate concepts (keep highest score)
        const conceptMap = new Map<string, ConceptMatch>()
        for (const match of matches) {
            const key = match.concept.key
            const existing = conceptMap.get(key)
            if (!existing || match.score > existing.score) {
                conceptMap.set(key, match)
            }
        }

        return Array.from(conceptMap.values()).sort((a, b) => b.score - a.score)
    }

    /**
     * Find exact match by label
     */
    private async findExactMatch(normalizedText: string): Promise<ConceptDoc | null> {
        const concepts = await this.conceptModel.find().lean<ConceptDoc[]>().exec()

        for (const concept of concepts) {
            const normalizedLabel = normalizeText(concept.label)
            if (normalizedLabel === normalizedText) {
                return concept
            }
        }

        return null
    }

    /**
     * Find match by alias
     */
    private async findAliasMatch(normalizedText: string): Promise<ConceptDoc | null> {
        const concepts = await this.conceptModel.find().lean<ConceptDoc[]>().exec()

        for (const concept of concepts) {
            if (concept.aliases && concept.aliases.length > 0) {
                for (const alias of concept.aliases) {
                    const normalizedAlias = normalizeText(alias)
                    if (normalizedAlias === normalizedText) {
                        return concept
                    }
                }
            }
        }

        return null
    }

    /**
     * Find match by embedding similarity
     * Note: This requires concepts to have embeddings pre-computed
     */
    private async findEmbeddingMatch(text: string): Promise<ConceptMatch | null> {
        // Get text embedding (placeholder - needs actual embedding service)
        const textEmbedding = await this.getTextEmbedding(text)

        if (!textEmbedding || textEmbedding.length === 0) {
            return null
        }

        // Find concepts with embeddings
        const concepts = await this.conceptModel
            .find({ embedding: { $exists: true, $ne: [] } })
            .lean<ConceptDoc[]>()
            .exec()

        if (concepts.length === 0) {
            return null
        }

        // Calculate similarities
        let bestMatch: ConceptDoc | null = null
        let bestScore = 0

        for (const concept of concepts) {
            if (concept.embedding && concept.embedding.length > 0) {
                try {
                    const similarity = cosineSimilarity(textEmbedding, concept.embedding)

                    if (similarity > bestScore && similarity >= this.EMBEDDING_SIMILARITY_THRESHOLD) {
                        bestScore = similarity
                        bestMatch = concept
                    }
                } catch (error) {
                    this.logger.warn(`Error calculating similarity for concept ${concept.key}: ${error.message}`)
                }
            }
        }

        if (bestMatch && bestScore >= this.EMBEDDING_SIMILARITY_THRESHOLD) {
            return {
                concept: bestMatch,
                score: bestScore,
                matchType: 'embedding',
                matchedText: text
            }
        }

        return null
    }

    /**
     * Get text embedding
     * TODO: Integrate with actual embedding service (OpenAI, local model, etc.)
     */
    private async getTextEmbedding(text: string): Promise<number[] | null> {
        // Placeholder implementation
        // In production, this should call an embedding service
        // For example: OpenAI embeddings, sentence-transformers, etc.

        // For now, return null to skip embedding matching
        // Uncomment and implement when embedding service is available

        try {
            const response = await this.getEmbeddingProvider.getEmbedding(text)
            return response
        } catch (error) {
            this.logger.error(`Error getting embedding for text: ${error.message}`)
            return null
        }
    }

    /**
     * Get all concepts (for caching/initialization)
     */
    async getAllConcepts(): Promise<ConceptDoc[]> {
        return this.conceptModel.find().lean<ConceptDoc[]>().exec()
    }
}
