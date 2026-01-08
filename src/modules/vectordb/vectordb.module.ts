import { Module } from '@nestjs/common'
import { VectordbController } from './vectordb.controller'
import { VectordbService } from './application/vectordb.service'
import { ChatBotModule } from '../chatbot/chatbot.module'

@Module({
    providers: [VectordbService],
    exports: [VectordbService],
    controllers: [VectordbController],
    imports: [ChatBotModule]
})
export class VectordbModule {}
