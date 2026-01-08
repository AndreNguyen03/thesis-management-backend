import { registerAs } from '@nestjs/config'

export default registerAs('groq', () => ({
    apiKey: process.env.GROQ_API_KEY
}))
