import { Injectable } from '@nestjs/common'
import { TopicRepositoryInterface } from '../repository'
import { TopicStatus } from '../enum'
import { register } from 'module'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'
import { PhaseHistory } from '../schemas/topic.schemas'

@Injectable()
export class UpdateTopicsBatchProvider {
    constructor(private readonly topicRepository: TopicRepositoryInterface) {}

    async updateTopicsBatchToExecutionPhase(
        periodId: string,
        actorId: string,
        force: boolean = false
    ): Promise<{ registeredTopics: number; cleanedUpTopics: number }> {
        //Task1: cập nhật những đề tài có trạng thái là registered hoặc full
        //Chuyển chúng sang pha mới với trạng thái là in-progress
        const registeredTopics = await this.topicRepository.findByCondition({
            periodId: periodId,
            currentPhase: PeriodPhaseName.OPEN_REGISTRATION,
            currentStatus: { $in: [TopicStatus.Registered, TopicStatus.Full] },
            deleted_at: null
        })
        console.log(`----Tìm thấy ${registeredTopics?.length ?? 0} đề tài đã đăng ký trong kì ${periodId}`)

        registeredTopics?.forEach(async (topic) => {
            await this.topicRepository.update(topic._id.toString(), {
                currentPhase: PeriodPhaseName.EXECUTION,
                currentStatus: TopicStatus.InProgress,
                phaseHistories: [
                    ...(topic.phaseHistories ?? []),
                    this.createPhaseHistory(actorId, PeriodPhaseName.EXECUTION, TopicStatus.InProgress)
                ]
            })
            console.log(`----Cập nhật đề tài ${topic._id} sang trạng thái Đang thực hiện thành công`)
        })
        //Task2: Dọn dẹp các đề tài bị kẹt lại
        // Những đề tài có trạng thái là pending registration hoặc cancelled mà BCN ép force bỏ qua
        //Chúng ta sẽ tự động cancel chúng
        if (force === false) return { registeredTopics: registeredTopics?.length ?? 0, cleanedUpTopics: 0 }

        const cleanupTopics = await this.topicRepository.findByCondition({
            periodId: periodId,
            currentPhase: PeriodPhaseName.OPEN_REGISTRATION,
            currentStatus: { $in: [TopicStatus.PendingRegistration, TopicStatus.Cancelled] },
            deleted_at: null
        })
        console.log(`----Tìm thấy ${cleanupTopics?.length ?? 0} đề tài cần dọn dẹp trong kì ${periodId}`)
        cleanupTopics?.forEach(async (topic) => {
            await this.topicRepository.update(topic._id.toString(), {
                currentStatus: TopicStatus.Cancelled,
                phaseHistories: [
                    ...(topic.phaseHistories ?? []),
                    this.createPhaseHistory(PeriodPhaseName.OPEN_REGISTRATION, TopicStatus.Cancelled)
                ]
            })
            console.log(`----Cập nhật đề tài ${topic._id} sang trạng thái Đang thực hiện thành công`)
        })
        console.log('Xử lí đề tài thành công!')
        return { registeredTopics: registeredTopics?.length ?? 0, cleanedUpTopics: cleanupTopics?.length ?? 0 }
    }

    async updateTopicsBatchToRegisPhase(periodId: string, actorId: string, force: boolean = false): Promise<number> {
        //Task1: cập nhật những đề tài có trạng thái là approved
        //Chuyển chúng sang pha mới với trạng thái là pending registration
        const approvedTopics = await this.topicRepository.findByCondition({
            periodId: periodId,
            currentPhase: PeriodPhaseName.SUBMIT_TOPIC,
            currentStatus: TopicStatus.Approved,
            deleted_at: null
        })
        console.log(`----Tìm thấy ${approvedTopics?.length ?? 0} đề tài đã được chấp thuận trong kì ${periodId}`)

        approvedTopics?.forEach(async (topic) => {
            await this.topicRepository.update(topic._id.toString(), {
                currentPhase: PeriodPhaseName.OPEN_REGISTRATION,
                currentStatus: TopicStatus.PendingRegistration,
                phaseHistories: [
                    ...(topic.phaseHistories ?? []),
                    this.createPhaseHistory(actorId, PeriodPhaseName.OPEN_REGISTRATION, TopicStatus.PendingRegistration)
                ]
            })
            console.log(`----Cập nhật đề tài ${topic._id} sang trạng thái Mở đăng ký thành công`)
        })
        //Không có dọn dẹp gì đâu
        return approvedTopics?.length ?? 0
    }

    async updateTopicsBatchToCompletionPhase(
        periodId: string,
        actorId: string,
        force: boolean = false
    ): Promise<number> {
        //Task1: cập nhật những đề tài có trạng thái là approved
        //Chuyển chúng sang pha mới với trạng thái là pending registration
        const awaitingEvaluationTopics = await this.topicRepository.findByCondition({
            periodId: periodId,
            currentPhase: PeriodPhaseName.EXECUTION,
            currentStatus: TopicStatus.Approved,
            deleted_at: null
        })
        console.log(`----Tìm thấy ${awaitingEvaluationTopics?.length ?? 0} đề tài đang chờ đánh giá ${periodId}`)
        return awaitingEvaluationTopics?.length ?? 0
    }
    public createPhaseHistory(currentPhase: string, currentStatus: string, actor?: string) {
        const newPhaseHistory = new PhaseHistory()
        newPhaseHistory.phaseName = currentPhase
        newPhaseHistory.status = currentStatus
        if (actor) newPhaseHistory.actor = actor
        else {
            newPhaseHistory.actor = 'system'
            newPhaseHistory.notes = 'Hệ thống tự động cập nhật trạng thái đề tài khi chuyển pha'
        }
        return newPhaseHistory
    }
}
