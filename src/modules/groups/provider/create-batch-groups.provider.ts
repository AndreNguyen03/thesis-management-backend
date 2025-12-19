import { Inject, Injectable } from '@nestjs/common'
import { IGroupRepository } from '../repository/groups.repository.interface'
import { Topic } from '../../topics/schemas/topic.schemas'
import { BaseServiceAbstract } from '../../../shared/base/service/base.service.abstract'
import { Group } from '../schemas/groups.schemas'
import { GetRegistrationInTopicProvider } from '../../registrations/provider/get-registration-in-topic.provider'
import mongoose from 'mongoose'
@Injectable()
export class CreateBatchGroupsProvider extends BaseServiceAbstract<Group> {
    constructor(
        @Inject('IGroupRepository')
        private readonly iGroupRepository: IGroupRepository,
        private readonly getRegistrationInTopicProvider: GetRegistrationInTopicProvider
    ) {
        super(iGroupRepository)
    }
    //tạo nhóm cho đề tài đưuọc ghi nhận là có người đăng ký
    async createBatchGroupsAfterOpeningRegistration(registeredTopics: Topic[]): Promise<void> {
        for (const topic of registeredTopics) {
            //lấy các sinh viên đã đăng ký đề tài này
            const participants = await this.getRegistrationInTopicProvider.getParticipantsInTopic(topic._id.toString())
            //tạo nhóm cho đề tài
            try {
                await this.create({
                    topicId: topic._id,
                    type: 'group',
                    participants: participants.map((id) => new mongoose.Types.ObjectId(id))
                })
            } catch (error) {
                console.log(`[ERROR] Tạo nhóm cho đề tài ${topic._id} thất bại:`, error)
            }
        }
        console.log(`Tạo ${registeredTopics.length} nhóm cho các đề tài có sinh viên đăng ký thành công`)
    }
}
