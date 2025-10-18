export interface AIProvider {
    generateDescription(topicTitle: string, description?: string): Promise<string>
    suggestRequirements(existingTags: string[], description: string): Promise<string[]>
}
