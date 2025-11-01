export interface AIModelConfig {
    provider: string
    model: string
    apiKey?: string
}

export interface VectorSearchConfig {
    provider: string
    db_namespace: string
    db_collection: string
    db_api_endpoint: string
    db_application_token: string
}

export interface EmbeddingConfig {
    provider: string
    model: string
}
