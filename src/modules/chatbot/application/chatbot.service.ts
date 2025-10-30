import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { AIIntegrationService } from './ai-integration.service'
import { ChatRequestDto } from '../dtos'
import { BuildAstraDB } from '../dtos/build-astra-db.dto'

@Injectable()
export class ChatBotService {
    private readonly systemPrompt = `
        You are an AI assistant who knows everything about the principle of register a thesis
         at University of Information Technology - VNUHCM and relevant regulations about thesis,
        project1, project2 registration. Use the below context to augment what you know about topic registration proccess. 
        The context will provide you with the most recent page from uit website that is place to publish regulations about thesis registration with students.
        If the context doesn't include the information you need, answer based on your existing knowledge and don't mention the source of your information or what the context does or doesn't include.
        Format responses using markdown where applicable and don't return images.
        `
    constructor(private readonly aiIntegrationService: AIIntegrationService) {}

    async requestChatbot(chatRequest: ChatRequestDto) {
        try {
            const { messages } = chatRequest
            console.log('Streaming started...')

            const last = messages[messages.length - 1]
            const latestMessage = last?.parts?.find((c) => c.type === 'text')?.text ?? ''
            console.log('Latest message:', latestMessage)
            if (!latestMessage) {
                throw new HttpException('No text content found in message', HttpStatus.BAD_REQUEST)
            }

            // Generate embedding
            let vector: number[]
            try {
                vector = await this.aiIntegrationService.generateEmbedding(latestMessage)
            } catch (err) {
                console.error('Embedding error:', err)
                throw new HttpException(
                    {
                        error: 'Embedding generation failed',
                        details: err.message
                    },
                    HttpStatus.INTERNAL_SERVER_ERROR
                )
            }

            // Query database for similar docs
            let documents: any[] = []
            try {
                documents = await this.aiIntegrationService.searchSimilarDocuments(vector)
            } catch (err) {
                console.error('❌ Database query error:', err)
                throw new HttpException(
                    {
                        error: 'Database query failed',
                        details: err.message
                    },
                    HttpStatus.INTERNAL_SERVER_ERROR
                )
            }

            // ✅ Build retrieval context
            const context = documents.map((doc) => doc.text).join('\n\n')

            const fullSystemPrompt = `
                ${this.systemPrompt}
                _________
                START CONTEXT
                ${context}
                END CONTEXT
                __________
                QUESTION: ${latestMessage}
                __________
            `

            // ✅ Stream AI response
            try {
                console.log('Streaming AI response...')
                return await this.aiIntegrationService.streamAIResponse(fullSystemPrompt, messages)
            } catch (err) {
                console.error('AI streaming error:', err)
                throw new HttpException(
                    {
                        error: 'AI streaming failed',
                        details: err.message
                    },
                    HttpStatus.INTERNAL_SERVER_ERROR
                )
            }
        } catch (error) {
            console.error('Error processing chat:', error)
            if (error instanceof HttpException) {
                throw error
            }
            throw new HttpException('Error processing chat', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    async buildAstraDB(buildAstraDB: BuildAstraDB) {
        return await this.aiIntegrationService.buildAstraDB(buildAstraDB)
    }
}
