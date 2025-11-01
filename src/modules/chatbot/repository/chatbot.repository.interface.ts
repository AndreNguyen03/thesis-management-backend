import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { ChatBot } from '../schemas/chatbot.schemas'
import { ChatbotVersion } from '../schemas/chatbot_version.schemas'

export interface ChatBotRepositoryInterface extends BaseRepositoryInterface<ChatbotVersion> {
    getChatBotEnabled(): Promise<ChatbotVersion | null>
}
