/**
 * Trie Index for efficient alias matching
 * Reduces complexity from O(n*m) to O(n*L) where L is average text length
 */

export interface TrieNode {
  children: Map<string, TrieNode>
  isEndOfWord: boolean
  // Store concept keys that end at this node
  conceptKeys: string[]
  // Store matched aliases for reference
  matchedAliases: string[]
}

export class TrieIndex {
  private root: TrieNode

  constructor() {
    this.root = this.createNode()
  }

  private createNode(): TrieNode {
    return {
      children: new Map(),
      isEndOfWord: false,
      conceptKeys: [],
      matchedAliases: []
    }
  }

  /**
   * Insert a preprocessed alias into the Trie
   * @param alias - Preprocessed alias text
   * @param conceptKey - Associated concept key
   * @param originalAlias - Original alias before preprocessing (for reference)
   */
  insert(alias: string, conceptKey: string, originalAlias: string): void {
    let node = this.root
    const tokens = alias.split(' ').filter(t => t.length > 0)

    // Insert full phrase
    for (const char of alias) {
      if (!node.children.has(char)) {
        node.children.set(char, this.createNode())
      }
      node = node.children.get(char)!
    }
    node.isEndOfWord = true
    if (!node.conceptKeys.includes(conceptKey)) {
      node.conceptKeys.push(conceptKey)
      node.matchedAliases.push(originalAlias)
    }

    // Also insert individual tokens for partial matching
    for (const token of tokens) {
      if (token.length < 3) continue // Skip very short tokens
      
      let tokenNode = this.root
      for (const char of token) {
        if (!tokenNode.children.has(char)) {
          tokenNode.children.set(char, this.createNode())
        }
        tokenNode = tokenNode.children.get(char)!
      }
      tokenNode.isEndOfWord = true
      if (!tokenNode.conceptKeys.includes(conceptKey)) {
        tokenNode.conceptKeys.push(conceptKey)
        tokenNode.matchedAliases.push(originalAlias)
      }
    }
  }

  /**
   * Search for exact match
   * @param text - Preprocessed search text
   * @returns Array of matched concept keys with aliases
   */
  searchExact(text: string): Array<{ conceptKey: string, matchedAlias: string }> {
    let node = this.root
    
    for (const char of text) {
      if (!node.children.has(char)) {
        return []
      }
      node = node.children.get(char)!
    }

    if (node.isEndOfWord) {
      return node.conceptKeys.map((key, idx) => ({
        conceptKey: key,
        matchedAlias: node.matchedAliases[idx]
      }))
    }

    return []
  }

  /**
   * Search for prefix matches
   * @param prefix - Preprocessed prefix text
   * @returns Array of matched concept keys with aliases
   */
  searchPrefix(prefix: string): Array<{ conceptKey: string, matchedAlias: string }> {
    let node = this.root
    
    for (const char of prefix) {
      if (!node.children.has(char)) {
        return []
      }
      node = node.children.get(char)!
    }

    // Collect all concepts from this node and descendants
    const results = new Map<string, string>()
    this.collectConcepts(node, results)
    
    return Array.from(results.entries()).map(([key, alias]) => ({
      conceptKey: key,
      matchedAlias: alias
    }))
  }

  private collectConcepts(node: TrieNode, results: Map<string, string>): void {
    if (node.isEndOfWord) {
      node.conceptKeys.forEach((key, idx) => {
        if (!results.has(key)) {
          results.set(key, node.matchedAliases[idx])
        }
      })
    }

    for (const child of node.children.values()) {
      this.collectConcepts(child, results)
    }
  }

  /**
   * Search with fuzzy token matching
   * Matches if any token in the text matches any token in aliases
   * @param text - Preprocessed search text
   * @returns Array of matched concept keys with aliases and scores
   */
  searchFuzzyTokens(text: string): Array<{ conceptKey: string, matchedAlias: string, score: number }> {
    const tokens = text.split(' ').filter(t => t.length > 2)
    if (tokens.length === 0) return []

    const matchScores = new Map<string, { alias: string, matchedTokens: number }>()

    for (const token of tokens) {
      const matches = this.searchExact(token)
      
      for (const match of matches) {
        const existing = matchScores.get(match.conceptKey)
        if (existing) {
          existing.matchedTokens++
        } else {
          matchScores.set(match.conceptKey, {
            alias: match.matchedAlias,
            matchedTokens: 1
          })
        }
      }
    }

    // Calculate scores based on matched tokens
    return Array.from(matchScores.entries()).map(([key, data]) => ({
      conceptKey: key,
      matchedAlias: data.alias,
      score: data.matchedTokens / tokens.length
    })).filter(r => r.score > 0.3) // Minimum 30% token overlap
      .sort((a, b) => b.score - a.score)
  }

  /**
   * Search with substring matching
   * Checks if the search text is contained in any alias
   * @param text - Preprocessed search text
   * @returns Array of matched concept keys with aliases and scores
   */
  searchSubstring(text: string): Array<{ conceptKey: string, matchedAlias: string, score: number }> {
    const results: Array<{ conceptKey: string, matchedAlias: string, score: number }> = []
    
    // Try searching with each suffix of the text (sliding window)
    for (let i = 0; i < text.length; i++) {
      const substring = text.substring(i)
      if (substring.length < 3) continue
      
      const prefixMatches = this.searchPrefix(substring)
      for (const match of prefixMatches) {
        const score = substring.length / text.length
        if (score > 0.5) { // Minimum 50% overlap
          results.push({
            conceptKey: match.conceptKey,
            matchedAlias: match.matchedAlias,
            score
          })
        }
      }
    }

    // Deduplicate by keeping highest score per concept
    const bestScores = new Map<string, { alias: string, score: number }>()
    for (const result of results) {
      const existing = bestScores.get(result.conceptKey)
      if (!existing || result.score > existing.score) {
        bestScores.set(result.conceptKey, {
          alias: result.matchedAlias,
          score: result.score
        })
      }
    }

    return Array.from(bestScores.entries())
      .map(([key, data]) => ({
        conceptKey: key,
        matchedAlias: data.alias,
        score: data.score
      }))
      .sort((a, b) => b.score - a.score)
  }

  /**
   * Get statistics about the Trie
   */
  getStats(): { totalNodes: number, totalConcepts: number } {
    let nodeCount = 0
    const uniqueConcepts = new Set<string>()

    const traverse = (node: TrieNode) => {
      nodeCount++
      node.conceptKeys.forEach(key => uniqueConcepts.add(key))
      for (const child of node.children.values()) {
        traverse(child)
      }
    }

    traverse(this.root)

    return {
      totalNodes: nodeCount,
      totalConcepts: uniqueConcepts.size
    }
  }
}

/**
 * Build Trie index from concepts array
 * @param concepts - Array of concepts with aliases
 * @param preprocessFn - Function to preprocess alias text
 * @returns Built TrieIndex
 */
export function buildTrieIndex(
  concepts: Array<{ key: string; aliases: string[] }>,
  preprocessFn: (text: string) => string
): TrieIndex {
  const trie = new TrieIndex()
  
  for (const concept of concepts) {
    for (const alias of concept.aliases) {
      const processed = preprocessFn(alias)
      trie.insert(processed, concept.key, alias)
    }
  }

  return trie
}
