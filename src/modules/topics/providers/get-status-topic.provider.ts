import { Inject, Injectable } from '@nestjs/common'
import { TopicRepositoryInterface } from '../repository'

@Injectable()
export class GetTopicStatusProvider {
    constructor(
        @Inject('TopicRepositoryInterface') private readonly topicRepositoryInterface: TopicRepositoryInterface
    ) {}

    async getCurrentStatusTopic(topicId: string): Promise<string> {
        return this.topicRepositoryInterface.getCurrentStatusTopic(topicId)
    }
    
}
