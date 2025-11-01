import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { ChatBot } from '../../schemas/chatbot.schemas'
import { ChatBotRepositoryInterface } from '../chatbot.repository.interface'
import { Model } from 'mongoose'
import { ChatbotVersion } from '../../schemas/chatbot_version.schemas'
import { ChatbotStatus } from '../../enums/chatbot-status.enum'

export class ChatBotRepository extends BaseRepositoryAbstract<ChatbotVersion> implements ChatBotRepositoryInterface {
    constructor(@InjectModel(ChatbotVersion.name) private readonly chatbotModel: Model<ChatbotVersion>) {
        super(chatbotModel)
    }
    async getChatBotEnabled(): Promise<ChatbotVersion | null> {
        const chatBot = await this.chatbotModel.findOne({ status: ChatbotStatus.ENABLED }).exec()
        return chatBot ? chatBot.toObject() : null
    }
    // Implement the methods defined in ChatRepositoryInterface
}
