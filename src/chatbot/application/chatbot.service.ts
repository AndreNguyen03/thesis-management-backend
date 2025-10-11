import { Injectable, HttpException, HttpStatus } from '@nestjs/common'
import { Response } from 'express'
import { convertToModelMessages, streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { AIIntegrationService } from './ai-integration.service'
import { ChatRequestDto } from '../dtos'

@Injectable()
export class ChatBotService {
    private readonly systemPrompt = `
        Bạn là một trợ lý AI thông minh giúp sinh viên về các vấn đề học tập và luận văn.
        Hãy trả lời một cách chính xác và hữu ích dựa trên ngữ cảnh được cung cấp.
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
                console.error('❌ Embedding error:', err)
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
}
