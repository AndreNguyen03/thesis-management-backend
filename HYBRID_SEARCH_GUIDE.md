# 📚 Tài Liệu Hướng Dẫn: Cải Thiện Tìm Kiếm Giảng Viên với Hybrid Search & RAG

## 🎯 Tổng Quan

Hệ thống đã được nâng cấp toàn diện để giải quyết vấn đề:

- **Vấn đề cũ**: Tìm "Lê Văn Tuấn chuyên AI" → trả về cả người tên Lê Văn Tuấn nhưng không chuyên AI + người chuyên AI nhưng không tên Lê Văn Tuấn
- **Giải pháp**: Kết hợp **Hybrid Search** (keyword + semantic) + **Named Entity Recognition (NER)** + **LLM Reranking** + **Smart Caching**

---

## 🏗️ Kiến Trúc Mới

### **Pipeline Tìm Kiếm**

```
Query → Query Parser (NER) → Enhanced Embedding → Hybrid Search → Reranker → Cache → Results
```

### **Các Components Chính**

#### 1. **Query Parser Provider**

- **Chức năng**: Detect name entities và parse query thành structured format
- **Kỹ thuật**:
    - Regex patterns cho Vietnamese names
    - Validation với common surnames
    - LLM fallback khi regex fail
    - Expand technical abbreviations (AI → AI artificial intelligence trí tuệ nhân tạo)
- **Output**:

```typescript
{
  personNames: ["Lê Văn Tuấn"],
  concepts: ["AI", "trí tuệ nhân tạo", "chuyên ngành"],
  rawQuery: "Lê Văn Tuấn chuyên AI",
  hasNameEntity: true
}
```

#### 2. **Enhanced Embedding Provider**

- **Chức năng**: Generate embeddings với preprocessing và field boosting
- **Kỹ thuật**:
    - Expand abbreviations (AI → AI artificial intelligence trí tuệ nhân tạo ML DL...)
    - Reduce weight của person names (repeat 1x)
    - Boost concepts (repeat 2-3x)
    - Clean HTML tags, normalize whitespace

- **Methods**:
    - `embedParsedQuery()`: Embed query với structured parsing
    - `embedLecturerProfile()`: Embed profile với field boosting
    - `embedTopicWithBoost()`: Embed topic với priority fields

#### 3. **Hybrid Lecturer Search Provider**

- **Chức năng**: Kết hợp keyword matching (name) + semantic search
- **Strategies**:

**Strategy A: Name-First (khi query có tên)**

```
1. Keyword filter by name (exact + fuzzy)
2. Semantic search on filtered pool
3. Merge scores: finalScore = 0.4 * nameScore + 0.6 * semanticScore
```

**Strategy B: Semantic-Only (khi query không có tên)**

```
1. Semantic search with concept-focused embedding
2. Apply dynamic threshold (0.6-0.75 based on query length)
```

- **Features**:
    - Dynamic score thresholds
    - Diversity filter (MMR - Maximal Marginal Relevance)
    - Multi-field matching (name, research interests, area, bio)

#### 4. **Lecturer Reranker Provider**

- **Chức năng**: Re-rank results bằng LLM (Llama 3.3 70B)
- **Factors**:
    1. Name match quality (exact > fuzzy > semantic-only)
    2. Expertise alignment (research interests, area of interest)
    3. Experience (title, publications, citations)

- **Output**: Mỗi lecturer có `rerankScore` (0-1) và `rerankReason` (1-2 câu giải thích)

#### 5. **Lecturer Search Cache Provider**

- **Chức năng**: Cache query parsing, embeddings, và search results
- **TTL**:
    - Query parsing: 10 minutes
    - Embeddings: 30 minutes (stable)
    - Search results: 5 minutes
- **Features**:
    - MD5 hashing for cache keys
    - LRU eviction (max 1000 entries)
    - Prefix-based invalidation
    - Hit rate tracking

---

## 📝 Cách Sử Dụng

### **1. Tìm Kiếm Giảng Viên (Lecturer Search Tool)**

```typescript
// Query có tên cụ thể
await lecturerSearchTool.search('Lê Văn Tuấn chuyên AI', { limit: 5 })[
    // Results:
    ({
        fullName: 'Lê Văn Tuấn',
        matchType: 'exact-name', // Exact name match
        scores: {
            name: 1.0, // Perfect name match
            semantic: 0.85, // High semantic match
            combined: 0.94, // 0.4*1.0 + 0.6*0.85
            rerank: 0.96 // LLM boosted score
        },
        matchReason:
            'Trùng khớp chính xác về tên và chuyên môn AI rất phù hợp, có nhiều công trình về machine learning.'
    },
    {
        fullName: 'Nguyễn Văn A',
        matchType: 'semantic-only', // No name match
        scores: {
            name: 0,
            semantic: 0.92, // Very high semantic match
            combined: 0.55, // 0.4*0 + 0.6*0.92
            rerank: 0.75 // LLM adjusted
        },
        matchReason: 'Chuyên môn AI rất phù hợp với nhiều công trình về deep learning và NLP.'
    })
]
```

**→ Kết quả**: Lê Văn Tuấn (exact name + AI expertise) sẽ top 1, người chỉ chuyên AI nhưng khác tên sẽ rank thấp hơn.

### **2. Profile Matching (Tìm Giảng Viên Cho Sinh Viên)**

```typescript
// Student profile: { skills: ["Python", "Machine Learning"], interests: ["AI", "Computer Vision"] }
await profileMatchingTool.search('Gợi ý giảng viên', { limit: 5, userId: '...' })

// Results tương tự lecturer search, nhưng semantic query được build từ profile
```

---

## 🔧 Cấu Hình & Tuning

### **Score Weights (Hybrid Search)**

```typescript
// Trong HybridLecturerSearchProvider
{
  semanticWeight: 0.6,  // Trọng số semantic similarity
  nameWeight: 0.4       // Trọng số name matching
}
```

**Điều chỉnh**:

- Nếu muốn **name match quan trọng hơn**: `nameWeight: 0.5-0.6`
- Nếu muốn **semantic quan trọng hơn**: `semanticWeight: 0.7-0.8`

### **Dynamic Thresholds**

```typescript
// QueryParserProvider.getDynamicThreshold()
- Query có tên: 0.6        // Lower để cho phép more semantic matches
- Query ngắn (<3 words): 0.65
- Query trung bình: 0.7
- Query dài: 0.75          // Higher cho precision
```

### **Diversity Filter (MMR)**

```typescript
// HybridLecturerSearchProvider.applyDiversityFilter()
lambda = 0.7 // Balance: 0.7 relevance + 0.3 diversity
```

**Điều chỉnh**:

- `lambda = 1.0`: Chỉ xét relevance (no diversity)
- `lambda = 0.5`: Balance 50-50
- `lambda = 0.3`: Ưu tiên diversity

---

## 🚀 Deployment & Testing

### **1. Re-index Lecturer Profiles**

```bash
# Run indexing script với enhanced profile builder
cd thesis-management-backend
npm run index:lecturers

# Hoặc call API endpoint (nếu có)
POST /knowledge-source/sync-lecturers
```

**Lưu ý**: Profile text mới có structured fields và abbreviation expansion, cần re-index tất cả lecturer profiles.

### **2. Test Queries**

```typescript
// Test case 1: Name + Expertise
Query: "Lê Văn Tuấn chuyên AI"
Expected: Exact name match với AI expertise → top 1

// Test case 2: Only expertise
Query: "giảng viên chuyên blockchain"
Expected: Semantic matches, no name bias

// Test case 3: Fuzzy name
Query: "Tuấn AI"
Expected: Fuzzy match Lê Văn Tuấn nếu có

// Test case 4: Complex query
Query: "thầy có kinh nghiệm về deep learning và computer vision"
Expected: High semantic precision, multi-concept match
```

### **3. Monitor Performance**

```typescript
// Check cache stats
const stats = lecturerSearchCache.getStats()
console.log(`Hit rate: ${stats.hitRate * 100}%`)

// Clear cache after profile updates
lecturerSearchCache.invalidateSearchCache()
```

---

## 📊 Kết Quả Dự Kiến

### **Trước Khi Cải Thiện**

| Query            | Issue                                        | Score Top 1            |
| ---------------- | -------------------------------------------- | ---------------------- |
| "Lê Văn Tuấn AI" | Trả về người tên Lê Văn Tuấn không chuyên AI | 0.75 (name weight cao) |
| "Lê Văn Tuấn AI" | Hoặc người chuyên AI không tên Lê Văn Tuấn   | 0.82 (semantic cao)    |

### **Sau Khi Cải Thiện**

| Query            | Top Result              | Name Score | Semantic Score | Final Score | Rerank Score        |
| ---------------- | ----------------------- | ---------- | -------------- | ----------- | ------------------- |
| "Lê Văn Tuấn AI" | Lê Văn Tuấn (chuyên AI) | 1.0        | 0.85           | 0.91        | 0.95                |
| "Lê Văn Tuấn AI" | Lê Văn Tuấn (không AI)  | 1.0        | 0.35           | 0.61        | 0.45 (LLM downrank) |
| "Lê Văn Tuấn AI" | Nguyễn A (chuyên AI)    | 0          | 0.92           | 0.55        | 0.72                |

**→ Giải pháp**: Lê Văn Tuấn chuyên AI sẽ top 1 với high confidence (0.95).

---

## 🔍 Troubleshooting

### **Issue 1: Name không được detect**

**Nguyên nhân**: Vietnamese name pattern không match

**Giải pháp**:

```typescript
// Add custom name pattern in QueryParserProvider
private readonly customNames = new Set(['Tên', 'Đặc', 'Biệt'])
```

### **Issue 2: Semantic score quá thấp**

**Nguyên nhân**: Abbreviation không được expand

**Giải pháp**:

```typescript
// Add abbreviation in EnhancedEmbeddingProvider
technicalAbbreviations.set('xyz', 'XYZ full expansion ...')
```

### **Issue 3: LLM reranking chậm**

**Giải pháp**:

- Reduce số candidates: `limit * 2` → `limit * 1.5`
- Use faster LLM model: `llama-3.1-8b-instant`
- Skip reranking for cached queries

### **Issue 4: Cache miss rate cao**

**Nguyên nhân**: Query variations nhiều

**Giải pháp**:

```typescript
// Normalize query before caching
const normalizedQuery = query.toLowerCase().trim()
```

---

## 📈 Optimization Tips

### **1. Improve Embedding Quality**

- **Lớp 1**: Thêm domain-specific terms vào `technicalAbbreviations`
- **Lớp 2**: Fine-tune embedding model trên Vietnamese lecturer data
- **Lớp 3**: Use multi-lingual embedding (e.g., multilingual-e5-large)

### **2. Speed Up Search**

- **Parallel processing**: Embed query + fetch name matches cùng lúc
- **Index optimization**: Add compound index trên `fullName + researchInterests`
- **Reduce candidates**: Tune `numCandidates` parameter

### **3. Improve Reranking**

- **Batch reranking**: Group multiple queries
- **Prompt optimization**: Shorten LLM prompt
- **Hybrid scoring**: Combine rule-based + LLM scores

---

## 🎓 Advanced Usage

### **Custom Search Strategies**

```typescript
// Strategy for specific use cases
async customSearch(query: string, options: {
  favorNameMatch?: boolean,  // Boost name weight
  favorExpertise?: boolean,  // Boost semantic weight
  requiredTitle?: string[]   // Filter by title
}) {
  const weights = {
    semanticWeight: options.favorExpertise ? 0.7 : 0.5,
    nameWeight: options.favorNameMatch ? 0.5 : 0.3
  }

  let results = await hybridSearch.search(query, weights)

  if (options.requiredTitle) {
    results = results.filter(r => options.requiredTitle.includes(r.title))
  }

  return results
}
```

### **A/B Testing**

```typescript
// Compare old vs new search
const oldResults = await oldSearchMethod(query)
const newResults = await hybridSearch.search(query)

// Log for comparison
console.log('Old top 1:', oldResults[0].fullName)
console.log('New top 1:', newResults[0].fullName)
```

---

## 📚 References

- **Hybrid Search**: [Pinecone Hybrid Search Guide](https://www.pinecone.io/learn/hybrid-search-intro/)
- **MMR (Diversity)**: [Maximal Marginal Relevance](https://www.cs.cmu.edu/~jgc/publication/The_Use_MMR_Diversity_Based_LTMIR_1998.pdf)
- **Vietnamese NER**: Regex patterns based on common Vietnamese naming conventions
- **LLM Reranking**: [Cohere Rerank](https://docs.cohere.com/docs/reranking)

---

## ✅ Checklist Triển Khai

- [x]   1. Tạo Query Parser Provider
- [x]   2. Tạo Enhanced Embedding Provider
- [x]   3. Tạo Hybrid Lecturer Search Provider
- [x]   4. Tạo Lecturer Reranker Provider
- [x]   5. Tạo Lecturer Search Cache Provider
- [x]   6. Cải thiện Profile Text Builder
- [x]   7. Update Profile Matching Tool
- [x]   8. Update Lecturer Search Tool
- [x]   9. Update Module Imports
- [ ]   10. **Re-index tất cả lecturer profiles**
- [ ]   11. **Test với real queries**
- [ ]   12. **Monitor performance & tune parameters**

---

## 🤝 Support

Nếu có vấn đề, check logs:

```typescript
console.log('🔍 [HYBRID SEARCH] ...') // Hybrid search logs
console.log('📝 [QUERY PARSER] ...') // Query parsing logs
console.log('🎯 [RERANKER] ...') // Reranking logs
console.log('💾 [CACHE] ...') // Cache logs
```

---

**Phiên bản**: 1.0.0  
**Ngày cập nhật**: January 16, 2026  
**Tác giả**: AI Assistant
