import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { convertToModelMessages, streamText } from 'ai'

@Injectable()
export class GenerationProvider {
    private google: any
    constructor(private configService: ConfigService) {
        this.google = createGoogleGenerativeAI({
            apiKey: this.configService.get<string>('GOOGLE_API_KEY')!
        })
    }
    public async *streamAIResponse(prompt: string, messages: any[]): AsyncIterable<string> {
        //console.log('Streaming with Google Gemini...')
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
