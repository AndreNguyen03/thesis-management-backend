import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService, ConfigType } from '@nestjs/config'
import { convertToModelMessages, streamText } from 'ai'
import { googleAIConfig } from '../../../config/googleai.config'

@Injectable()
export class GenerationProvider {
    private google: any
    constructor(
        @Inject(googleAIConfig.KEY)
        private readonly googleAIConfigValue: ConfigType<typeof googleAIConfig>
    ) {
        this.google = createGoogleGenerativeAI({
            apiKey: this.googleAIConfigValue.apiKey
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
}
