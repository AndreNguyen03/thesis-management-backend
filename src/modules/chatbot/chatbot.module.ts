import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ChatController } from './chatbot.controller'
import { ChatBotService } from './application/chatbot.service'
import { MongooseModule } from '@nestjs/mongoose'
import { ChatBot, ChatBotSchema } from './schemas/chatbot.schemas'
import { AIIntegrationService } from './application/ai-integration.service'

@Module({
    controllers: [ChatController],
    providers: [ChatBotService, AIIntegrationService],
    imports: [ConfigModule, MongooseModule.forFeature([{ name: ChatBot.name, schema: ChatBotSchema }])],
    exports: [ChatBotService, AIIntegrationService]
})
export class ChatBotModule {}
