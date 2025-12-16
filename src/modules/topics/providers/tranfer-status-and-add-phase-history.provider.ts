import { BadRequestException, Inject, Injectable, RequestTimeoutException } from '@nestjs/common'
import { PhaseHistory } from '../schemas/topic.schemas'
import { TopicRepositoryInterface } from '../repository'
import mongoose from 'mongoose'
import { TopicNotFoundException } from '../../../common/exceptions'
import { TopicStatus } from '../enum'
import { Period, PeriodPhase } from '../../periods/schemas/period.schemas'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'
import { validate } from 'class-validator'
import { ValidateTopicStatusProvider } from './validate-status.provider'

@Injectable()
export class TranferStatusAndAddPhaseHistoryProvider {
    constructor(
        @Inject('TopicRepositoryInterface')
        private readonly topicRepository: TopicRepositoryInterface,
        private readonly validateTopicStatusProvider: ValidateTopicStatusProvider
    ) {}
    //chuyển trạng thái đề tài (thủ công ) với các hành độgn như từ chối, chấp nhận, tạm dừng,...
    //truyền period khi chueyenr pha từ draft sang submitted
    async transferStatusAndAddPhaseHistory(
        topicId: string,
        newStatus: string,
        actorId: string,
        note: string = '',
        periodId?: string
    ) {
        const existingTopic = await this.topicRepository.findOneByCondition({
            _id: new mongoose.Types.ObjectId(topicId),
            deleted_at: null
        })

        if (!existingTopic) {
            throw new TopicNotFoundException()
        }
        const res = this.throwExceptionIfActionIsPracticed(existingTopic.currentStatus, newStatus)
        if (!res) return

        //Xác thực xem chuyển trạng thái có hợp lệ hay không/ đúng thứ tự hay không

        if (!this.validateTopicStatusProvider.validateStatusManualTransition(existingTopic.currentStatus, newStatus)) {
            throw new BadRequestException('Chuyển trạng thái đề tài không hợp lệ')
        }
        const newPhaseHistory = new PhaseHistory()
        ;((newPhaseHistory.phaseName = periodId ? PeriodPhaseName.SUBMIT_TOPIC : existingTopic.currentPhase),
            (newPhaseHistory.status = newStatus))
        newPhaseHistory.actor = actorId
        if (existingTopic.phaseHistories == null || !Array.isArray(existingTopic.phaseHistories)) {
            existingTopic.phaseHistories = []
        }
        newPhaseHistory.note = note
        console.log('New Phase History:', newPhaseHistory)
        existingTopic.phaseHistories.push(newPhaseHistory)

        // nếu đề tài chuyển từ trạng thái đã nộp về lại nháp thì cần
        //xóa lịch sử pha
        //periodId cũng xóa
        if (newStatus === TopicStatus.Draft) {
            existingTopic.periodId = ''
            existingTopic.currentPhase = PeriodPhaseName.EMPTY
            existingTopic.currentStatus = TopicStatus.Draft
        }
        //  console.log(existingTopic.phaseHistories)
        try {
            await this.topicRepository.update(topicId, {
                phaseHistories: existingTopic.phaseHistories,
                currentStatus: newStatus,
                currentPhase: periodId ? PeriodPhaseName.SUBMIT_TOPIC : existingTopic.currentPhase,
                periodId: periodId ? periodId : existingTopic.periodId
            })
        } catch (error) {
            throw new RequestTimeoutException('Chuyển trạng thái đề tài không thành công')
        }
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
