import * as Joi from 'joi'

export default Joi.object({
    NODE_ENV: Joi.string().valid('development', 'test', 'production', 'staging').default('development'),

    // API
    API_VERSION: Joi.string().required(),
    PROFILE_API_KEY: Joi.string().required(),
    CLIENT_URL: Joi.string().required(),

    // MongoDB
    MONGO_URI: Joi.string().required(),
    MONGO_DB_NAME: Joi.string().required(),

    // JWT
    JWT_SECRET: Joi.string().required(),
    JWT_TOKEN_AUDIENCE: Joi.string().required(),
    JWT_TOKEN_ISSUER: Joi.string().required(),
    JWT_ACCESS_TOKEN_TTL: Joi.number().required(),
    JWT_REFRESH_TOKEN_TTL: Joi.number().required(),

    // Redis
    REDIS_HOST: Joi.string().required(),
    REDIS_PORT: Joi.number().port().default(6379),
    REDIS_TTL: Joi.number().default(900), // in seconds, default 15 minutes

    // Mail (SMTP)
    MAIL_HOST: Joi.string().required(),
    MAIL_PORT: Joi.number().port().default(587),
    SMTP_USERNAME: Joi.string().required(),
    SMTP_PASSWORD: Joi.string().required(),

    //AI Model Configuration
    // ASTRA_DB_NAMESPACE: Joi.string().required(),
    // ASTRA_DB_COLLECTION: Joi.string().required(),
    // ASTRA_DB_API_ENDPOINT: Joi.string().required(),
    GEMINI_API_KEY: Joi.string().required()
})
