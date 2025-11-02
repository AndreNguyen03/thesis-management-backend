import { registerAs } from '@nestjs/config'

export const googleAIConfig = registerAs('googleai', () => {
    return {
        apiKey: process.env.GEMINI_API_KEY || ''
    }
})
