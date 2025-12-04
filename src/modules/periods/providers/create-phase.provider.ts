import { BadRequestException, Inject, Injectable } from '@nestjs/common'
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
import { PeriodPhaseName } from '../enums/period-phases.enum'
import { PeriodPhase } from '../schemas/period.schemas'
import { TopicService } from '../../topics/application/topic.service'
import { TopicStatus } from '../../topics/enum'
import { UpdateTopicsPhaseBatchProvider } from '../../topics/providers/update-topics-batch.provider'

@Injectable()
export class CreatePhaseProvider {
    constructor(
        @Inject('IPeriodRepository') private readonly iPeriodRepository: IPeriodRepository,
        private readonly validatePeriodPhaseProvider: ValidatePeriodPhaseProvider,
        private readonly topicService: TopicService,
        private readonly updateTopicsBatchProvider: UpdateTopicsPhaseBatchProvider
    ) {}
    //Khởi tạo sơ khai cho kì mới
    async initalizePhasesForNewPeriod(periodId: string): Promise<boolean> {
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
        console.log('Cấu hình pha Submit Topic thành công!', newPeriodPhase)
        return this.iPeriodRepository.configPhaseInPeriod(newPeriodPhase, periodId)
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
        await this.iPeriodRepository.configPhaseInPeriod(newPeriodPhase, periodId)
        console.log('Chuyển pha thành công!')
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
        await this.iPeriodRepository.configPhaseInPeriod(newPeriodPhase, periodId)
        console.log('Chuyển pha thành công!')
        return {
            success: true,
            message: `Chuyển sang ${PeriodPhaseName.EXECUTION} thành công. ${registeredTopics} đề tài tiến hành thực hiện, dọn dẹp ${cleanedUpTopics} đề tài.`
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
        await this.iPeriodRepository.configPhaseInPeriod(newPeriodPhase, periodId)
        return {
            success: true,
            message: `Chuyển sang ${PeriodPhaseName.COMPLETION} thành công. Có tổng cộng ${evaluationTopics} đề tài đang chờ được bảo vệ.`
        }
    }
}
