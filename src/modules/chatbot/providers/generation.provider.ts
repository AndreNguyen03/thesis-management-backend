import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService, ConfigType } from '@nestjs/config'
import { convertToModelMessages, generateText, streamText } from 'ai'
import { googleAIConfig } from '../../../config/googleai.config'
import groqConfig from '../../../config/groq.config'
import Groq from 'groq-sdk'
@Injectable()
export class GenerationProvider {
    private google: any
    private groq: any
    private readonly logger = new Logger(GenerationProvider.name)
    constructor(
        @Inject(googleAIConfig.KEY)
        private readonly googleAIConfigValue: ConfigType<typeof googleAIConfig>,
        @Inject(groqConfig.KEY)
        private readonly groqConfigValue: ConfigType<typeof groqConfig>
    ) {
        this.google = createGoogleGenerativeAI({
            apiKey: this.googleAIConfigValue.apiKey
        })
        this.groq = new Groq({
            apiKey: this.groqConfigValue.apiKey
        })
    }
    public async *streamAIResponse(prompt: string, messages: any[]): AsyncIterable<string> {
        console.log('Streaming AI response with prompt and messages...', prompt)
        console.log('Streaming with Google Gemini...')
        const result = await streamText({
            model: this.google('models/gemini-2.5-flash'),
            system: prompt,
            messages: convertToModelMessages(messages)
        })
        for await (const text of result.textStream) {
            yield text
        }
    }

    public async generateOnce(prompt: string): Promise<string> {
        try {
            this.logger.debug('🧠 GenerationOnce prompt:')
            this.logger.debug(prompt)


            //             const result = await generateText({
            //                 model: this.google('models/gemini-2.5-flash'),
            //                 system: `Bạn là hệ thống AI chỉ trả về câu trả lời NGẮN GỌN, CHÍNH XÁC.
            // Không giải thích, không markdown, không lan man.`,
            //                 prompt,
            //                 temperature: 0
            //             })

            //             const text = result.text
            const systemPrompt = `Bạn là hệ thống AI chỉ trả về câu trả lời NGẮN GỌN, CHÍNH XÁC.
Không giải thích, không markdown, không lan man.`

            const response = await this.groq.chat.completions.create({
                model: 'openai/gpt-oss-120b', // model Groq
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0
            })

            const text = response.choices?.[0]?.message?.content

            if (!text) {
                throw new Error('Gemini trả về nội dung rỗng')
            }

            this.logger.debug('✅ GenerationOnce result:')
            this.logger.debug(text)

            return text.trim()
        } catch (error) {
            this.logger.error('❌ GenerationOnce failed', error instanceof Error ? error.stack : String(error))
            throw error
        }
    }
}
