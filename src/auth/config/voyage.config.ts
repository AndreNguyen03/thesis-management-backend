import { registerAs } from '@nestjs/config'

export default registerAs('voyage', () => {
    return {
        apiKey: process.env.VOYAGE_API_KEY || ''
    }
})
