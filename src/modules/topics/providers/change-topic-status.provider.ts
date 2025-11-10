import { Inject, Injectable } from '@nestjs/common'
import { TopicRepositoryInterface } from '../repository';

@Injectable()
export class ChangeTopicStatusProvider {
    constructor(
        @Inject('TopicRepositoryInterface') private readonly topicRepositoryInterface: TopicRepositoryInterface
    ) {}
}
