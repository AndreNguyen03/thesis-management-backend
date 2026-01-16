# Quick Start Guide - Concept Inference API

## Setup

1. **Module is already registered** in `app.module.ts`
2. **Database schema** is defined in `concept.schema.ts`
3. **Student schema** already has `skills` and `interests` fields

## Step 1: Seed Concepts Database

Create a script or use existing data to populate concepts:

```typescript
// Example concepts to insert
const exampleConcepts = [
    {
        key: 'cs.ai.machine_learning',
        label: 'Machine Learning',
        aliases: ['ML', 'machine learning', 'máy học'],
        depth: 3,
        embedding: [] // Optional: add embeddings later
    },
    {
        key: 'cs.ai.nlp',
        label: 'Natural Language Processing',
        aliases: ['NLP', 'natural language processing', 'xử lý ngôn ngữ tự nhiên'],
        depth: 3,
        embedding: []
    },
    {
        key: 'cs.ai.deep_learning',
        label: 'Deep Learning',
        aliases: ['deep learning', 'DL', 'học sâu'],
        depth: 4,
        embedding: []
    },
    {
        key: 'cs.databases.nosql',
        label: 'NoSQL Databases',
        aliases: ['nosql', 'mongodb', 'cassandra', 'non-relational'],
        depth: 3,
        embedding: []
    }
]
```

## Step 2: Test the API

### Using cURL

```bash
# Test with existing student
curl -X POST http://localhost:3000/matching/concepts/infer-student \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "YOUR_STUDENT_ID_HERE"
  }'
```

### Using Postman/Insomnia

```http
POST /matching/concepts/infer-student
Content-Type: application/json

{
  "studentId": "507f1f77bcf86cd799439011"
}
```

### Using TypeScript/JavaScript

```typescript
const response = await fetch('http://localhost:3000/matching/concepts/infer-student', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        studentId: '507f1f77bcf86cd799439011'
    })
})

const data = await response.json()
console.log('Inferred concepts:', data)
```

## Step 3: Verify Student Data

Make sure your student has skills and interests:

```typescript
// Example student document
{
  _id: "507f1f77bcf86cd799439011",
  userId: "...",
  studentCode: "SV001",
  skills: [
    "Machine Learning",
    "Python",
    "Deep Learning",
    "MongoDB"
  ],
  interests: [
    "Artificial Intelligence",
    "Natural Language Processing",
    "Data Science"
  ]
}
```

## Expected Response

```json
{
    "studentId": "507f1f77bcf86cd799439011",
    "keys": ["cs.ai.machine_learning", "cs.ai.deep_learning", "cs.ai.nlp", "cs.databases.nosql"],
    "labels": ["Machine Learning", "Deep Learning", "Natural Language Processing", "NoSQL Databases"],
    "aliases": [
        ["ML", "machine learning", "máy học"],
        ["deep learning", "DL", "học sâu"],
        ["NLP", "natural language processing", "xử lý ngôn ngữ tự nhiên"],
        ["nosql", "mongodb", "cassandra", "non-relational"]
    ],
    "concepts": [
        {
            "key": "cs.ai.machine_learning",
            "label": "Machine Learning",
            "aliases": ["ML", "machine learning", "máy học"],
            "depth": 3,
            "score": 1.0,
            "source": "skills",
            "matchedText": "Machine Learning"
        },
        {
            "key": "cs.ai.deep_learning",
            "label": "Deep Learning",
            "aliases": ["deep learning", "DL", "học sâu"],
            "depth": 4,
            "score": 0.95,
            "source": "skills",
            "matchedText": "Deep Learning"
        },
        {
            "key": "cs.ai.nlp",
            "label": "Natural Language Processing",
            "aliases": ["NLP", "natural language processing"],
            "depth": 3,
            "score": 1.0,
            "source": "interests",
            "matchedText": "Natural Language Processing"
        },
        {
            "key": "cs.databases.nosql",
            "label": "NoSQL Databases",
            "aliases": ["nosql", "mongodb", "cassandra"],
            "depth": 3,
            "score": 0.95,
            "source": "skills",
            "matchedText": "MongoDB"
        }
    ],
    "totalConcepts": 4
}
```

## Response Fields Explanation

### Top-Level Arrays (for easy access)

- **keys[]**: Array of concept keys only
- **labels[]**: Array of concept labels only
- **aliases[][]**: Array of arrays containing aliases for each concept

### Detailed Concepts Array

Each concept in `concepts[]` contains:

- **key**: Unique hierarchical identifier
- **label**: Human-readable name
- **aliases**: Alternative names/keywords
- **depth**: Position in concept hierarchy
- **score**: Match confidence (1.0 = exact, 0.95 = alias, 0.7-0.99 = embedding)
- **source**: Where the match came from ('skills' or 'interests')
- **matchedText**: Original text that matched

## Batch Processing

Process multiple students at once:

```bash
curl -X POST http://localhost:3000/matching/concepts/infer-student-batch \
  -H "Content-Type: application/json" \
  -d '{
    "studentIds": [
      "507f1f77bcf86cd799439011",
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439013"
    ]
  }'
```

## Troubleshooting

### Issue: "Student not found"

**Solution**: Verify the student ID exists in the database

```bash
# Check if student exists
db.students.findOne({ _id: ObjectId("507f1f77bcf86cd799439011") })
```

### Issue: "No concepts found"

**Possible causes**:

1. Student has no skills/interests
2. Concept database is empty
3. No aliases match the student's text

**Solution**:

- Add skills/interests to student profile
- Seed concept database with common terms
- Add more aliases to existing concepts

### Issue: Low match scores

**Solution**:

- Implement embedding service for semantic matching
- Add more aliases to concepts
- Normalize student input data

## Adding Embedding Support

To enable semantic matching via embeddings:

1. **Choose an embedding service**:
    - OpenAI API
    - Local model (sentence-transformers)
    - HuggingFace API

2. **Implement embedding service**:

```typescript
// embedding.service.ts
import { Injectable } from '@nestjs/common'
import OpenAI from 'openai'

@Injectable()
export class EmbeddingService {
    private openai: OpenAI

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        })
    }

    async getEmbedding(text: string): Promise<number[]> {
        const response = await this.openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text
        })
        return response.data[0].embedding
    }
}
```

3. **Update ConceptMatcherService**:

```typescript
// In concept-matcher.service.ts
constructor(
    @InjectModel(Concept.name) private conceptModel: Model<Concept>,
    private embeddingService: EmbeddingService // Inject here
) {}

private async getTextEmbedding(text: string): Promise<number[] | null> {
    try {
        return await this.embeddingService.getEmbedding(text)
    } catch (error) {
        this.logger.error(`Error getting embedding: ${error.message}`)
        return null
    }
}
```

4. **Pre-compute concept embeddings**:

```typescript
// Script to add embeddings to concepts
async function addEmbeddingsToConcepts() {
    const concepts = await conceptModel.find()

    for (const concept of concepts) {
        const embedding = await embeddingService.getEmbedding(concept.label)
        concept.embedding = embedding
        await concept.save()
    }
}
```

## Next Steps

1. ✅ Test basic API with sample student
2. ⬜ Seed concept database with domain concepts
3. ⬜ Add more aliases for better matching
4. ⬜ Implement embedding service (optional)
5. ⬜ Pre-compute embeddings for all concepts
6. ⬜ Integrate with student profile UI
7. ⬜ Add caching for performance
8. ⬜ Monitor and optimize matching accuracy

## Integration Example

```typescript
// In your existing service
import { StudentConceptInferenceService } from '@modules/matching'

@Injectable()
export class StudentProfileService {
    constructor(private readonly conceptInference: StudentConceptInferenceService) {}

    async getStudentWithConcepts(studentId: string) {
        // Get basic student info
        const student = await this.studentModel.findById(studentId)

        // Infer concepts
        const concepts = await this.conceptInference.inferConceptsForStudent(studentId)

        return {
            ...student.toObject(),
            inferredConcepts: concepts
        }
    }

    async recommendTopicsForStudent(studentId: string) {
        // Get student concepts
        const studentConcepts = await this.conceptInference.inferConceptsForStudent(studentId)

        // Use concepts to find matching topics/advisors
        const matchingTopics = await this.findTopicsByConceptKeys(studentConcepts.keys)

        return matchingTopics
    }
}
```

## Performance Tips

1. **Cache concepts in memory**: Load all concepts at startup
2. **Use batch processing**: Process multiple students together
3. **Index database fields**: Ensure `key` and `aliases` are indexed
4. **Limit response size**: Return only top N concepts if needed
5. **Async processing**: Use queues for large batch jobs

## API Documentation

Once running, visit Swagger UI:

- **URL**: `http://localhost:3000/api`
- **Section**: "Concept Inference"
- **Endpoints**:
    - POST /matching/concepts/infer-student
    - POST /matching/concepts/infer-student-batch
