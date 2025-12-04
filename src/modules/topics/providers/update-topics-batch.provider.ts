import { Inject, Injectable } from '@nestjs/common'
import { TopicRepositoryInterface } from '../repository'
import { TopicStatus } from '../enum'
import { register } from 'module'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'
import { PhaseHistory } from '../schemas/topic.schemas'

@Injectable()
export class UpdateTopicsPhaseBatchProvider {
    constructor(@Inject('TopicRepositoryInterface') private readonly topicRepository: TopicRepositoryInterface) {}

    async updateTopicsBatchToExecutionPhase(
        periodId: string,
        actorId: string
    ): Promise<{ registeredTopics: number; cleanedUpTopics: number }> {
        console.log('================= UPDATE TOPICS BATCH → EXECUTION PHASE =================')
        console.log('[INPUT]', { periodId, actorId })

        console.log('\n----[TASK 1] Tìm đề tài có sinh viên đăng ký ----')
        const registeredTopics = await this.topicRepository.findByCondition({
            periodId: periodId,
            currentPhase: PeriodPhaseName.OPEN_REGISTRATION,
            currentStatus: { $in: [TopicStatus.Registered, TopicStatus.Full] },
            deleted_at: null
        })

        console.log(`[RESULT] Số lượng đề tài chuyển sang EXECUTION: ${registeredTopics?.length ?? 0}`)

        // 1) Chuyển các đề tài có đăng ký sang EXECUTION
        for (const topic of registeredTopics ?? []) {
            const payload = {
                currentPhase: PeriodPhaseName.EXECUTION,
                currentStatus: TopicStatus.InProgress,
                phaseHistories: [
                    ...(topic.phaseHistories ?? []),
<<<<<<< HEAD
                    this.createPhaseHistory(PeriodPhaseName.EXECUTION, TopicStatus.InProgress, actorId)
=======
                    this.createPhaseHistory( PeriodPhaseName.EXECUTION, TopicStatus.InProgress, actorId)
>>>>>>> 544f215 (fix(update-batch-history): fix logic)
                ]
            }

            console.log(`\n[UPDATE] Cập nhật đề tài ${topic._id}:`, payload)
            await this.topicRepository.update(topic._id.toString(), payload)
            console.log(`[OK] -> ${topic._id} chuyển sang InProgress`)
        }

        console.log('\n----[TASK 2] Tự động dọn dẹp đề tài KHÔNG có sinh viên đăng ký ----')

        // Tìm các đề tài không có ai đăng ký
        const unregisteredTopics = await this.topicRepository.findByCondition({
            periodId: periodId,
            currentPhase: PeriodPhaseName.OPEN_REGISTRATION,
            currentStatus: { $in: [TopicStatus.PendingRegistration, TopicStatus.Cancelled] },
            deleted_at: null
        })

        console.log(`[RESULT] Đề tài không có người đăng ký cần đưa về Draft: ${unregisteredTopics?.length ?? 0}`)

        // 2) Tự động chuyển về Draft
        for (const topic of unregisteredTopics ?? []) {
            const payload = {
                currentPhase: PeriodPhaseName.OPEN_REGISTRATION, // vẫn giữ phase cũ
                currentStatus: TopicStatus.Draft, // auto chuyển về Draft
                phaseHistories: [
                    ...(topic.phaseHistories ?? []),
                    this.createPhaseHistory( PeriodPhaseName.OPEN_REGISTRATION, TopicStatus.Draft, actorId)
                ]
            }

            console.log(`\n[CLEANUP] Chuyển đề tài ${topic._id} → Draft`, payload)
            await this.topicRepository.update(topic._id.toString(), payload)
            console.log(`[OK] -> ${topic._id} chuyển về Draft`)
        }

        console.log('\n===== SUCCESS: Xử lý batch đề tài hoàn tất! =====')

        return {
            registeredTopics: registeredTopics?.length ?? 0,
            cleanedUpTopics: unregisteredTopics?.length ?? 0
        }
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
                    this.createPhaseHistory(PeriodPhaseName.OPEN_REGISTRATION, TopicStatus.PendingRegistration, actorId)
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
            newPhaseHistory.note = 'Hệ thống tự động cập nhật trạng thái đề tài khi chuyển pha'
        }
        return newPhaseHistory
    }
}
