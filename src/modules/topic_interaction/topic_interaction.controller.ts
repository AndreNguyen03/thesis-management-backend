import { Body, Controller, Post, Req } from '@nestjs/common'
import { TopicInteractionService } from './application/topic_interaction.service'
import { CreateTopicInteractionDto } from './dtos/create-topic-interaction.dto'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'

@Controller('topic-interaction')
@Auth(AuthType.Bearer)
export class TopicInteractionController {
    constructor(private readonly topicInteractionService: TopicInteractionService) {}

    @Post()
    async logInteraction(@Req() req: { user: ActiveUserData }, @Body() dto: CreateTopicInteractionDto) {
        await this.topicInteractionService.logInteraction(req.user.sub, dto.topicId, dto.action)
        return { success: true }
    }
}
