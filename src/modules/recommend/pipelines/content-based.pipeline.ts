// import { Injectable } from '@nestjs/common'
// import { TopicService } from '../../topics/application/topic.service'
// import { FieldsService } from '../../fields/application/fields.service'
// import { GetEmbeddingProvider } from '../../chatbot/application/get-embedding.provider'
// import { Reranker } from './rerank.pipeline'
// import { BadgeGenerator } from './badge-generator'
// import { StudentService } from '../../../users/application/student.service'
// import { RequirementsService } from '../../requirements/application/requirements.service'
// import { CandidateTopicDto, FieldDto, RequirementDto } from '../../topics/dtos/candidate-topic.dto'
// import { cosineSimilarity } from '../utils/similarity'
// import { buildTopicSummary } from '../utils/build-topic-summarize'
// import { StudentProfileDto } from '../../../users/dtos/student.dto'
// import { EnrichedRecommendation } from '../dto/recommendation-response.dto'

// interface SemanticScoredTopic {
//     topic: CandidateTopicDto
//     topicSummary: string
//     semanticScore: number
// }

// @Injectable()
// export class ContentBasedPipeline {
//     constructor(
//         private readonly topicService: TopicService,
//         private readonly embeddingProvider: GetEmbeddingProvider,
//         private readonly reranker: Reranker,
//         private readonly badgeGen: BadgeGenerator,
//         private readonly studentService: StudentService
//     ) {}

//     async runPipeline(studentId: string): Promise<EnrichedRecommendation[]> {
//         /**
//          * 1️⃣ Load data
//          */
//         const studentProfile = await this.studentService.getStudentProfile(studentId)
//         const candidateTopics = await this.topicService.getCandidateTopics()

//         /**
//          * 2️⃣ Build student summary (semantic)
//          */
//         const studentSummary = `
//             Giới thiệu: ${studentProfile?.bio || ''}
//             Sở thích: ${studentProfile?.interests.join(', ') || 'Chưa có'}
//             Kỹ năng: ${studentProfile?.skills.join(', ') || 'Chưa có'}
//         `

//         /**
//          * 3️⃣ Student embedding (semantic vector)
//          */
//         const studentEmbedding = await this.embeddingProvider.getEmbedding(studentSummary)

//         /**
//          * 4️⃣ Content-based scoring (semantic similarity)
//          */
//         const semanticScored: SemanticScoredTopic[] = []

//         for (const topic of candidateTopics) {
//             const topicSummary = buildTopicSummary(topic)
//             const topicEmbedding = await this.embeddingProvider.getEmbedding(topicSummary)

//             const semanticScore = cosineSimilarity(studentEmbedding, topicEmbedding)

//             semanticScored.push({
//                 topic,
//                 topicSummary,
//                 semanticScore
//             })
//         }

//         /**
//          * 5️⃣ Select top-K for reranking
//          */
//         semanticScored.sort((a, b) => b.semanticScore - a.semanticScore)
//         const topForRerank = semanticScored.slice(0, 20)

//         /**
//          * 6️⃣ Rerank (lexical refinement)
//          */
//         const rerankScores = await this.reranker.rerank(
//             topForRerank.map((t) => t.topicSummary),
//             studentSummary
//         )

//         /**
//          * 7️⃣ Final scoring (semantic dominant)
//          */
//         const finalRanked = topForRerank.map((item, idx) => {
//             const rerankScore = rerankScores[idx] || 0

//             const finalScore = item.semanticScore * 0.8 + rerankScore * 0.2 // rerank chỉ là refinement

//             return {
//                 topic: item.topic,
//                 initialScore: item.semanticScore,
//                 rerankScore,
//                 finalScore
//             }
//         })

//         finalRanked.sort((a, b) => b.finalScore - a.finalScore)

//         /**
//          * 8️⃣ Badge + Explanation (dùng skill / interest / score)
//          */
//         const enriched = await this.badgeGen.generateBadges(
//             finalRanked.slice(0, 10),
//             studentProfile as StudentProfileDto
//         )

//         /**
//          * 9️⃣ Map response cho frontend
//          */
//         return enriched.map((rec) => ({
//             ...rec.topic,
//             initialScore: rec.initialScore,
//             rerankScore: rec.rerankScore,
//             finalScore: rec.finalScore,
//             badges: rec.badges,
//             explanations: rec.explanations
//         }))
//     }
// }


