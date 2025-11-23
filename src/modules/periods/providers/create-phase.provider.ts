import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { IPeriodRepository } from '../repository/periods.repository.interface'
import {
    CreateCompletionPhaseDto,
    CreateExecutionPhaseDto,
    CreateOpenRegPhaseDto,
    CreatePhaseSubmitTopicDto
} from '../dtos/period-phases.dtos'
import { PeriodNotFoundException } from '../../../common/exceptions/period-exceptions'
import { plainToClass, plainToInstance } from 'class-transformer'
import { ValidatePeriodPhaseProvider } from './validate-phase.provider'
import { PeriodPhaseName } from '../enums/period-phases.enum'
import { PeriodPhase } from '../schemas/period.schemas'
import { TopicService } from '../../topics/application/topic.service'
import { TopicStatus } from '../../topics/enum'
import { UpdateTopicsPhaseBatchProvider } from '../../topics/providers/update-topics-batch.provider'
import mongoose from 'mongoose'

@Injectable()
export class CreatePhaseProvider {
    constructor(
        @Inject('IPeriodRepository') private readonly iPeriodRepository: IPeriodRepository,
        private readonly validatePeriodPhaseProvider: ValidatePeriodPhaseProvider,
        private readonly topicService: TopicService,
        private readonly updateTopicsBatchProvider: UpdateTopicsPhaseBatchProvider
    ) {}
    //draft -> submit-topic
    async createPhaseSubmitTopic(
        actorId: string,
        periodId: string,
        dto: CreatePhaseSubmitTopicDto,
        force: boolean = false
    ) {
        //Kiểm tra xem đợi có tồn tại không
        const period = await this.iPeriodRepository.findOneById(periodId)
        if (!period) throw new PeriodNotFoundException()

        //Kiểm tra chuyển pha theo đúng trình tự
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
        return this.iPeriodRepository.createPhaseInPeriod(newPeriodPhase, periodId)
    }

    //submit-topic -> open registration
    async createPhaseOpenRegistration(
        actorId: string,
        periodId: string,
        dto: CreateOpenRegPhaseDto,
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
        const topics = await this.topicService.findByCondition({
            periodId: periodId,
            currentPhase: period.currentPhase,
            currentStatus: { $in: [TopicStatus.Submitted, TopicStatus.UnderReview] },
            deleted_at: null
        })

        if (topics) {
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
        await this.iPeriodRepository.createPhaseInPeriod(newPeriodPhase, periodId)
        console.log('Chuyển pha thành công!')
        return {
            success: true,
            message: `Chuyển sang ${PeriodPhaseName.EXECUTION} thành công. ${approvedTopicsCount} đề tài được mở đăng ký.`
        }
    }

    //open registration -> execution
    async createCreateExecutionPhaseDto(
        actorId: string,
        periodId: string,
        dto: CreateExecutionPhaseDto,
        force: boolean = false
    ): Promise<{ success: boolean; message: string }> {
        const period = await this.iPeriodRepository.findOneById(periodId)
        if (!period) throw new PeriodNotFoundException()

        //Kiểm tra chuyển pha theo đúng trình tự
        const isValid = await this.validatePeriodPhaseProvider.validateStatusManualTransition(
            period.currentPhase,
            PeriodPhaseName.EXECUTION
        )

        if (isValid) {
            throw new BadRequestException(
                `Kì đã ở trạng thái ${period.currentPhase}, không thể chuyển tiếp thành ${PeriodPhaseName.EXECUTION}`
            )
        }

        //Kiểm tra thời gian
        const currentPeriodPhase = period.phases.find((p: PeriodPhase) => p.phase === period.currentPhase)
        if (!force && new Date() < new Date(currentPeriodPhase!.endTime)) {
            throw new BadRequestException('Chưa đến thời gian kết thúc pha hiện tại. Có thể dùng force.')
        }

        //Kiểm tra toàn vẹn dữ liệu
        const topics = await this.topicService.findByCondition({
            periodId: periodId,
            currentPhase: period.currentPhase,
            currentStatus: { $in: [TopicStatus.Submitted, TopicStatus.UnderReview] },
            deleted_at: null
        })

        if (topics) {
            throw new BadRequestException(
                `Vẫn còn ${topics.length} đề tài ở trạng thái Submitted hoặc UnderReview. Có thể dùng force.`
            )
        }
        const { registeredTopics, cleanedUpTopics } =
            await this.updateTopicsBatchProvider.updateTopicsBatchToExecutionPhase(periodId, actorId)

        const newPeriodPhase = plainToClass(PeriodPhase, dto)
        await this.iPeriodRepository.createPhaseInPeriod(newPeriodPhase, periodId)
        console.log('Chuyển pha thành công!')
        return {
            success: true,
            message: `Chuyển sang ${PeriodPhaseName.EXECUTION} thành công. ${registeredTopics} đề tài tiến hành thực hiện, dọn dẹp ${cleanedUpTopics} đề tài.`
        }
    }

    //execution -> completion
    async createCompletionPhase(
        actorId: string,
        periodId: string,
        dto: CreateCompletionPhaseDto,
        force: boolean = false
    ): Promise<{ success: boolean; message: string }> {
        const period = await this.iPeriodRepository.findOneById(periodId)
        if (!period) throw new PeriodNotFoundException()

        //Kiểm tra chuyển pha theo đúng trình tự
        const isValid = await this.validatePeriodPhaseProvider.validateStatusManualTransition(
            period.currentPhase,
            PeriodPhaseName.EXECUTION
        )

        if (isValid) {
            throw new BadRequestException(
                `Kì đã ở trạng thái ${period.currentPhase}, không thể chuyển tiếp thành ${PeriodPhaseName.EXECUTION}`
            )
        }

        //Kiểm tra thời gian
        const currentPeriodPhase = period.phases.find((p: PeriodPhase) => p.phase === period.currentPhase)
        if (!force && new Date() < new Date(currentPeriodPhase!.endTime)) {
            throw new BadRequestException('Chưa đến thời gian kết thúc pha hiện tại. Có thể dùng force.')
        }
        const evaluationTopics = await this.updateTopicsBatchProvider.updateTopicsBatchToCompletionPhase(
            periodId,
            actorId
        )

        const newPeriodPhase = plainToClass(PeriodPhase, dto)
        await this.iPeriodRepository.createPhaseInPeriod(newPeriodPhase, periodId)
        return {
            success: true,
            message: `Chuyển sang ${PeriodPhaseName.COMPLETION} thành công. Có tổng cộng ${evaluationTopics} đề tài đang chờ được bảo vệ.`
        }
    }
}
