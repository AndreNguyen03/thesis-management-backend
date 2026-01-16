# Concept Inference API for Student Profiles

## Overview

API module for inferring research concepts from student profiles using a multi-stage matching pipeline.

## Pipeline Architecture

```
Student ID → Get Student Info → Extract Skills & Interests → Group Skills
    ↓
Text Processing → Normalize & Tokenize
    ↓
Alias Matching (Exact) → If Match → Return Concept
    ↓ (No Match)
Embedding Similarity → Cosine > Threshold → Return Concept
    ↓
Transform to Response Format
    ↓
{keys[], labels[], aliases[][], concepts[]}
```

## API Endpoints

### 1. Infer Concepts for Single Student

**POST** `/matching/concepts/infer-student`

#### Request Body

```json
{
    "studentId": "507f1f77bcf86cd799439011"
}
```

#### Response

```json
{
    "studentId": "507f1f77bcf86cd799439011",
    "keys": ["cs.ai.machine_learning", "cs.ai.nlp", "cs.databases.nosql"],
    "labels": ["Machine Learning", "Natural Language Processing", "NoSQL Databases"],
    "aliases": [
        ["ML", "Machine Learning"],
        ["NLP", "Natural Language Processing"],
        ["NoSQL", "Non-relational Databases"]
    ],
    "concepts": [
        {
            "key": "cs.ai.machine_learning",
            "label": "Machine Learning",
            "aliases": ["ML", "Machine Learning"],
            "depth": 3,
            "score": 1.0,
            "source": "skills",
            "matchedText": "machine learning"
        }
    ],
    "totalConcepts": 3
}
```

### 2. Batch Infer Concepts

**POST** `/matching/concepts/infer-student-batch`

#### Request Body

```json
{
    "studentIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
}
```

#### Response

```json
[
  {
    "studentId": "507f1f77bcf86cd799439011",
    "keys": [...],
    "labels": [...],
    "aliases": [...],
    "concepts": [...],
    "totalConcepts": 3
  },
  {
    "studentId": "507f1f77bcf86cd799439012",
    "keys": [...],
    "labels": [...],
    "aliases": [...],
    "concepts": [...],
    "totalConcepts": 5
  }
]
```

## Concept Schema

```typescript
{
  key: string              // "cs.ai.machine_learning"
  label: string            // "Machine Learning"
  aliases: string[]        // ["ML", "Machine Learning"]
  depth: number            // 3 (hierarchy depth)
  embedding?: number[]     // [0.1, 0.2, ...] (vector embedding)
}
```

## Matching Pipeline Details

### Stage 1: Text Processing

- Normalize text (lowercase, remove special chars)
- Tokenize into words
- Generate n-grams for multi-word concepts

### Stage 2: Exact Alias Matching

- Compare normalized text with concept aliases
- Match Score: 1.0 (exact) or 0.95 (alias)
- Fast, deterministic matching

### Stage 3: Embedding Similarity

- Calculate cosine similarity with concept embeddings
- Threshold: 0.7 (configurable)
- Used when no alias match found

### Stage 4: Deduplication

- Remove duplicate concepts
- Keep highest scoring match per concept
- Sort by score (descending)

## Configuration

### Environment Variables

```env
EMBEDDING_SIMILARITY_THRESHOLD=0.7  # Minimum similarity for embedding match
```

### Service Configuration

Edit `concept-matcher.service.ts`:

```typescript
private readonly EMBEDDING_SIMILARITY_THRESHOLD = 0.7
private readonly ALIAS_MATCH_THRESHOLD = 0.9
```

## Integration with Embedding Service

To enable embedding-based matching, implement the `getTextEmbedding` method in `ConceptMatcherService`:

```typescript
private async getTextEmbedding(text: string): Promise<number[] | null> {
    try {
        // Option 1: OpenAI Embeddings
        const response = await this.openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
        })
        return response.data[0].embedding

        // Option 2: Local Model (e.g., sentence-transformers)
        // const embedding = await this.embeddingService.encode(text)
        // return embedding
    } catch (error) {
        this.logger.error(`Error getting embedding: ${error.message}`)
        return null
    }
}
```

## Data Requirements

### Student Schema

Students must have:

- `skills: string[]` - Array of skill keywords
- `interests: string[]` - Array of interest keywords

### Concept Database

Concepts must be populated with:

- `key` - Unique hierarchical identifier
- `label` - Display name
- `aliases` - Alternative names/keywords
- `depth` - Hierarchy level
- `embedding` - (Optional) Pre-computed vector embeddings

## Usage Example

```typescript
// In your service
import { StudentConceptInferenceService } from '@modules/matching'

@Injectable()
export class MyService {
    constructor(private readonly conceptInference: StudentConceptInferenceService) {}

    async analyzeStudent(studentId: string) {
        const concepts = await this.conceptInference.inferConceptsForStudent(studentId)

        console.log(`Found ${concepts.totalConcepts} concepts`)
        console.log('Keys:', concepts.keys)
        console.log('Labels:', concepts.labels)

        return concepts
    }
}
```

## Testing

### Manual Testing with cURL

```bash
# Single student
curl -X POST http://localhost:3000/matching/concepts/infer-student \
  -H "Content-Type: application/json" \
  -d '{"studentId": "507f1f77bcf86cd799439011"}'

# Batch
curl -X POST http://localhost:3000/matching/concepts/infer-student-batch \
  -H "Content-Type: application/json" \
  -d '{"studentIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]}'
```

### Swagger UI

Visit: `http://localhost:3000/api` (if Swagger is configured)

Navigate to "Concept Inference" section

## Performance Considerations

### Optimization Tips

1. **Cache Concepts**: Load all concepts into memory at startup
2. **Batch Processing**: Use batch endpoint for multiple students
3. **Index Database**: Ensure `key` and `aliases` are indexed
4. **Embedding Pre-computation**: Pre-compute embeddings for all concepts
5. **Connection Pooling**: Configure MongoDB connection pool

### Expected Performance

- Single student: ~100-500ms (without embeddings)
- Single student: ~500-2000ms (with embeddings)
- Batch (10 students): ~1-5 seconds

## Error Handling

### Common Errors

| Status Code | Error                   | Solution                              |
| ----------- | ----------------------- | ------------------------------------- |
| 404         | Student not found       | Verify student ID exists              |
| 500         | Embedding service error | Check embedding service configuration |
| 400         | Invalid student ID      | Provide valid MongoDB ObjectId        |

### Logging

Logs include:

- Request received
- Student processing start/end
- Concept matches found
- Errors with stack traces

Log level: `INFO` (change to `DEBUG` for detailed matching logs)

## Future Enhancements

- [ ] Implement skill clustering/grouping
- [ ] Add caching layer (Redis)
- [ ] Support for multiple languages
- [ ] Fuzzy matching for typos
- [ ] Confidence scores per match
- [ ] Real-time concept updates
- [ ] Analytics dashboard

## Files Structure

```
src/modules/matching/
├── controllers/
│   └── concept-inference.controller.ts    # API endpoints
├── services/
│   ├── concept-matcher.service.ts         # Core matching logic
│   └── student-concept-inference.service.ts # Student pipeline
├── schemas/
│   └── concept.schema.ts                  # Concept model
├── dtos/
│   ├── infer-concept-request.dto.ts       # Request DTO
│   └── infer-concept-response.dto.ts      # Response DTO
├── utils/
│   └── text-processor.util.ts             # Text processing utilities
├── matching.module.ts                      # Module definition
└── README.md                               # This file
```

## License

Internal use - Thesis Management System
