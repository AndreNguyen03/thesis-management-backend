import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { ChatBot } from '../../schemas/chatbot.schemas'
import { ChatBotRepositoryInterface } from '../chatbot.repository.interface'

export class ChatBotRepository extends BaseRepositoryAbstract<ChatBot> implements ChatBotRepositoryInterface {
    // Implement the methods defined in ChatRepositoryInterface
}
