import { Inject, Injectable } from '@nestjs/common'
import { TopicRepositoryInterface } from '../repository'
import mongoose from 'mongoose'

@Injectable()
export class CheckAllowManualApprovalProvider {
    constructor(
        @Inject('TopicRepositoryInterface')
        private readonly topicRepositoryInterface: TopicRepositoryInterface
    ) {}

    async checkAllowManualApproval(topicId: string): Promise<boolean> {
        const topic = await this.topicRepositoryInterface.findOneByCondition({
            _id: new mongoose.Types.ObjectId(topicId),
            deleted_at: null
        })
        return topic?.allowManualApproval ?? false
    }
}
