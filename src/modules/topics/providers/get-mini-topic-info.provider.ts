import { Inject, Injectable } from '@nestjs/common'
import { TopicRepositoryInterface } from '../repository'
import { GetMiniTopicInfo } from '../dtos'

@Injectable()
export class GetMiniTopicInfoProvider {
    constructor(
        @Inject('TopicRepositoryInterface')
        private readonly topicRepositoryInterface: TopicRepositoryInterface
    ) {}
    public async getMiniTopicInfo(topicId: string): Promise<GetMiniTopicInfo> {
        return this.topicRepositoryInterface.getMiniTopicInfo(topicId)
    }
}
