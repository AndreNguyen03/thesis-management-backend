import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common'
import { IPeriodRepository } from '../repository/periods.repository.interface'
import {
    ConfigCompletionPhaseDto,
    ConfigExecutionPhaseDto,
    ConfigOpenRegPhaseDto,
    ConfigPhaseSubmitTopicDto
} from '../dtos/period-phases.dtos'
import { PeriodNotFoundException } from '../../../common/exceptions/period-exceptions'
import { plainToClass } from 'class-transformer'
import { ValidatePeriodPhaseProvider } from './validate-phase.provider'
import { PeriodPhaseName, PeriodPhaseStatus } from '../enums/period-phases.enum'
import { Period, PeriodPhase } from '../schemas/period.schemas'
import { TopicService } from '../../topics/application/topic.service'
import { TopicStatus } from '../../topics/enum'
import { UpdateTopicsPhaseBatchProvider } from '../../topics/providers/update-topics-batch.provider'
import { NotificationPublisherService } from '../../notifications/publisher/notification.publisher.service'
import { CreateBatchGroupsProvider } from '../../groups/provider/create-batch-groups.provider'
import mongoose from 'mongoose'

@Injectable()
export class CreatePhaseProvider {
    constructor(
        @Inject('IPeriodRepository') private readonly iPeriodRepository: IPeriodRepository,
        private readonly validatePeriodPhaseProvider: ValidatePeriodPhaseProvider,
        @Inject(forwardRef(() => TopicService)) private readonly topicService: TopicService,
        private readonly updateTopicsBatchProvider: UpdateTopicsPhaseBatchProvider,
        private readonly notificationPublisherService: NotificationPublisherService,
        private readonly createBatchGroupsProvider: CreateBatchGroupsProvider
    ) {}
    //Khởi tạo sơ khai cho kì mới
    async initalizePhasesForNewPeriod(periodId: string): Promise<Period> {
        return await this.iPeriodRepository.initalizePhasesForNewPeriod(periodId)
    }
    //draft -> submit-topic
    async configPhaseSubmitTopic(
        actorId: string,
        periodId: string,
        dto: ConfigPhaseSubmitTopicDto,
        force: boolean = false
    ) {
        //Kiểm tra xem đợt có tồn tại không
        const period = await this.iPeriodRepository.findOneById(periodId)
        if (!period) throw new PeriodNotFoundException()

        //Kiểm tra config/chuyển pha theo đúng trình tự chưa
        const isValid = await this.validatePeriodPhaseProvider.validateStatusManualTransition(
            period.currentPhase,
            PeriodPhaseName.SUBMIT_TOPIC
        )
        if (!isValid) {
            throw new BadRequestException(
                `Kì đã ở trạng thái ${period.currentPhase}, không thể chuyển tiếp thành ${PeriodPhaseName.SUBMIT_TOPIC}`
            )
        }
        const newPeriodPhase = plainToClass(PeriodPhase, dto)
        await this.iPeriodRepository.updateCurrentPhaseToCompleted(periodId)
        console.log('Cấu hình pha Submit Topic thành công!', newPeriodPhase)
        const res = await this.iPeriodRepository.configPhaseInPeriod(newPeriodPhase, periodId)
        if (res)
            await this.notificationPublisherService.sendPhaseSubmitTopicNotification(
                dto.requiredLecturerIds,
                periodId,
                newPeriodPhase.endTime
            )
    }

    //submit-topic -> open registration
    async configPhaseOpenRegistration(
        actorId: string,
        periodId: string,
        dto: ConfigOpenRegPhaseDto,
        force: boolean = false
    ) {
        const period = await this.iPeriodRepository.findOneById(periodId)
        if (!period) throw new PeriodNotFoundException()

        //Kiểm tra chuyển pha theo đúng trình tự
        const isValid = await this.validatePeriodPhaseProvider.validateStatusManualTransition(
            period.currentPhase,
            PeriodPhaseName.SUBMIT_TOPIC
        )

        if (isValid) {
            throw new BadRequestException(
                `Kì đã ở trạng thái ${period.currentPhase}, không thể chuyển tiếp thành ${PeriodPhaseName.SUBMIT_TOPIC}`
            )
        }

        //Kiểm tra thời gian
        const currentPeriodPhase = period.phases.find((p: PeriodPhase) => p.phase === period.currentPhase)
        if (new Date() < new Date(currentPeriodPhase!.endTime)) {
            throw new BadRequestException('Chưa đến thời gian kết thúc pha hiện tại. ')
        }

        //Kiểm tra toàn vẹn dữ liệu
        const topics =
            (await this.topicService.findByCondition({
                periodId: periodId,
                currentPhase: period.currentPhase,
                currentStatus: { $in: [TopicStatus.Submitted, TopicStatus.UnderReview] },
                deleted_at: null
            })) ?? []

        if (!force && topics.length > 0) {
            throw new BadRequestException(
                `Vẫn còn ${topics.length} đề tài ở trạng thái Submitted hoặc UnderReview. Có thể dùng force.`
            )
        }
        const approvedTopicsCount = await this.updateTopicsBatchProvider.updateTopicsBatchToRegisPhase(
            periodId,
            actorId,
            force
        )
        const newPeriodPhase = plainToClass(PeriodPhase, dto)
        await this.iPeriodRepository.updateCurrentPhaseToCompleted(periodId)
        await this.iPeriodRepository.configPhaseInPeriod(newPeriodPhase, periodId)
        return {
            success: true,
            message: `Chuyển sang ${PeriodPhaseName.OPEN_REGISTRATION} thành công. ${approvedTopicsCount} đề tài được mở đăng ký.`
        }
    }

    //open registration -> execution
    async configPhaseExecution(
        actorId: string,
        periodId: string,
        dto: ConfigExecutionPhaseDto,
        force: boolean = false
    ): Promise<{ success: boolean; message: string }> {
        console.log('================= CONFIG PHASE EXECUTION =================')
        const period = await this.iPeriodRepository.findOneById(periodId)
        if (!period) throw new PeriodNotFoundException()

        // Kiểm tra phase execution có tồn tại trong period không
        console.log('[CHECK] Validating execution phase exists')
        const executionPhaseExists = period.phases.some((p: PeriodPhase) => p.phase === PeriodPhaseName.EXECUTION)
        if (!executionPhaseExists) {
            console.log('[ERROR] Execution phase not initialized')
            throw new BadRequestException('Phase execution chưa được khởi tạo trong period')
        }

        // Cho phép config linh hoạt cho execution và completion
        console.log('[INFO] Allowing flexible phase configuration for execution')
        const isFlexible = await this.validatePeriodPhaseProvider.validateFlexiblePhaseConfig(PeriodPhaseName.EXECUTION)
        if (!isFlexible) {
            throw new BadRequestException('Phase execution không được phép config linh hoạt')
        }

        // Kiểm tra toàn vẹn dữ liệu
        console.log('[CHECK] Checking topics with invalid statuses...')
        const topics =
            (await this.topicService.findByCondition({
                periodId: periodId,
                currentPhase: period.currentPhase,
                currentStatus: { $in: [TopicStatus.PendingRegistration] },
                deleted_at: null
            })) ?? []

        console.log(`[RESULT] Found ${topics.length} topics in bad statuses`)
        if (topics.length > 0) {
            console.log(
                '[TOPICS]',
                topics.map((t) => ({ id: t._id, status: t.currentStatus }))
            )
        }

        if (!force && topics.length > 0) {
            console.log('[ERROR] INVALID TOPICS REMAINING')
            throw new BadRequestException(
                `Vẫn còn ${topics.length} đề tài ở trạng thái Submitted hoặc UnderReview. Có thể dùng force.`
            )
        }

        // Update topics batch
        console.log('[ACTION] Updating topics batch to execution phase...')
        const { registeredTopics, registeredTopicsNum, cleanedUpTopics } =
            await this.updateTopicsBatchProvider.updateTopicsBatchToExecutionPhase(periodId, actorId)

        console.log('[RESULT] Batch update result:', {
            registeredTopicsNum,
            cleanedUpTopics
        })

        //Tạo nhóm cho các đề tài đã được đăng ký
        console.log('\n----[TASK 3] Tạo nhóm chat cho đề tài đã đăng ký ----')
        //GROUP MODULE
        if (registeredTopics && registeredTopics.length > 0)
            //có đề tài được đăng ký
            await this.createBatchGroupsProvider.createBatchGroupsAfterOpeningRegistration(registeredTopics)

        // Cập nhật pha mới
        console.log('[ACTION] Updating phase config in DB...')
        const newPeriodPhase = plainToClass(PeriodPhase, dto)
        console.log('[NEW PHASE DATA]', newPeriodPhase)
        await this.iPeriodRepository.updateCurrentPhaseToCompleted(periodId)

        await this.iPeriodRepository.configPhaseInPeriod(newPeriodPhase, periodId)

        console.log('===== SUCCESS: Phase switched to EXECUTION =====')

        return {
            success: true,
            message: `Chuyển sang ${PeriodPhaseName.EXECUTION} thành công. ${registeredTopicsNum} đề tài tiến hành thực hiện, dọn dẹp ${cleanedUpTopics} đề tài.`
        }
    }

    //execution -> completion
    async configCompletionPhase(
        actorId: string,
        periodId: string,
        dto: ConfigCompletionPhaseDto,
        force: boolean = false
    ): Promise<{ success: boolean; message: string }> {
        const period = await this.iPeriodRepository.findOneById(periodId)
        if (!period) throw new PeriodNotFoundException()

        // Kiểm tra phase completion có tồn tại trong period không
        const completionPhaseExists = period.phases.some((p: PeriodPhase) => p.phase === PeriodPhaseName.COMPLETION)
        if (!completionPhaseExists) {
            throw new BadRequestException('Phase completion chưa được khởi tạo trong period')
        }

        // Cho phép config linh hoạt cho execution và completion
        const isFlexible = await this.validatePeriodPhaseProvider.validateFlexiblePhaseConfig(
            PeriodPhaseName.COMPLETION
        )
        if (!isFlexible) {
            throw new BadRequestException('Phase completion không được phép config linh hoạt')
        }

        const evaluationTopics = await this.updateTopicsBatchProvider.updateTopicsBatchToCompletionPhase(
            periodId,
            actorId
        )

        const newPeriodPhase = plainToClass(PeriodPhase, dto)
        await this.iPeriodRepository.configPhaseInPeriod(newPeriodPhase, periodId)
        return {
            success: true,
            message: `Chuyển sang ${PeriodPhaseName.COMPLETION} thành công. Có tổng cộng ${evaluationTopics} đề tài đang chờ được bảo vệ.`
        }
    }
}
