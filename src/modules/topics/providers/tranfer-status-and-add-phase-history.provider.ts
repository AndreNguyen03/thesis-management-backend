import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { PhaseHistory } from '../schemas/topic.schemas'
import { TopicRepositoryInterface } from '../repository'
import mongoose from 'mongoose'
import { TopicNotFoundException } from '../../../common/exceptions'
import { TopicStatus } from '../enum'

@Injectable()
export class TranferStatusAndAddPhaseHistoryProvider {
    constructor(
        @Inject('TopicRepositoryInterface')
        private readonly topicRepository: TopicRepositoryInterface
    ) {}
    async transferStatusAndAddPhaseHistory(topicId: string, newStatus: string, actorId: string) {
        const existingTopic = await this.topicRepository.findOneByCondition({
            _id: new mongoose.Types.ObjectId(topicId),
            deleted_at: null
        })

        if (!existingTopic) {
            throw new TopicNotFoundException()
        }
        const res = this.throwExceptionIfActionIsPracticed(existingTopic.currentStatus, newStatus)
        if (!res) return
        const newPhaseHistory = new PhaseHistory()
        newPhaseHistory.phaseName = existingTopic.currentPhase
        newPhaseHistory.status = newStatus
        newPhaseHistory.actor = actorId
        if (existingTopic.phaseHistories == null || Array.isArray(existingTopic.phaseHistories)) {
            existingTopic.phaseHistories = []
        }
        existingTopic.phaseHistories.push(newPhaseHistory)
        await this.topicRepository.update(topicId, {
            phaseHistories: existingTopic.phaseHistories,
            currentStatus: newStatus
        })
    }
    private throwExceptionIfActionIsPracticed(currentStatus: string, newStatus: string) {
        if (newStatus === currentStatus) {
            const messageList = {
                approved: 'Đề tài đã được chấp nhận và chuẩn bị sang pha mở đăng ký.',
                submitted: 'Bạn đã nộp đề tài này rồi.',
                rejected: 'Đề tài đã được đánh dấu là bị từ chối trước đó.',
                paused: 'Đề tài đã được tạm dừng trước đó.',
                in_progress: 'Đề tài đang trong quá trình thực hiện.',
                delayed: 'Đề tài đã được đánh dấu là bị trì hoãn trước đó.',
                reviewed: 'Đề tài đã được đánh giá lại trước đó.',
                awaiting_evaluation: 'Đề tài đang chờ đánh giá.',
                rejected_final: 'Đề tài đã bị từ chối cuối cùng.',
                graded: 'Đề tài đã được chấm điểm trước đó.',
                archived: 'Đề tài đã được lưu trữ trước đó.',
                under_review: 'Đề tài đang trong quá trình xem xét.'
            }
            if (newStatus !== TopicStatus.UnderReview) {
                throw new BadRequestException(messageList[newStatus] ?? 'Chuyển trạng thái đề tài không thành công')
            }
            return false
        }
        return true
    }
}
