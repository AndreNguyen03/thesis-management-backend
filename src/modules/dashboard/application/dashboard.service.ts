import { Injectable, NotFoundException } from '@nestjs/common'
import { SubmitPhaseProvider } from '../provider/submit-phase.provider'
import { RegistrationPhaseProvider } from '../provider/registration-phase.provider'
import { ExecutionPhaseProvider } from '../provider/execution-phase.provider'
import { CompletionPhaseProvider } from '../provider/completion-phase.provider'
import { GetPeriodInfoProvider } from '../../periods/providers/get-period-info.provider'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'
import { Period } from '../../periods/schemas/period.schemas'

@Injectable()
export class DashboardService {
    private readonly typeLabels = {
        thesis: 'Khóa luận',
        scientific_research: 'Nghiên cứu khoa học'
    } as const

    private readonly phaseDescriptions: Record<string, string> = {
        submit_topic: 'Giai đoạn nộp đề tài cho kỳ hiện tại.',
        open_registration: 'Giai đoạn mở đăng ký đề tài',
        execution: 'Giai đoạn thực hiện đề tài.',
        completion: 'Giai đoạn hoàn tất đề tài và chấm điểm.'
    }

    constructor(
        private readonly submitPhaseProvider: SubmitPhaseProvider,
        private readonly registrationPhaseProvider: RegistrationPhaseProvider,
        private readonly executionPhaseProvider: ExecutionPhaseProvider,
        private readonly completionPhaseProvider: CompletionPhaseProvider,
        private readonly getPeriodInfoProvider: GetPeriodInfoProvider
    ) {}

    async getLecturerDashboard(lecturerId: string, facultyId: string) {
        const { latestThesisPeriod, latestResearchPeriod } =
            await this.getPeriodInfoProvider.getCurrentPeriodInfo(facultyId)

        const [thesisDashboard, researchDashboard] = await Promise.all([
            this.buildDashboardForPeriod(latestThesisPeriod, lecturerId, (provider, periodId, id) =>
                provider.getLecturerDashboard(periodId, id)
            ),
            this.buildDashboardForPeriod(latestResearchPeriod, lecturerId, (provider, periodId, id) =>
                provider.getLecturerDashboard(periodId, id)
            )
        ])

        return {
            thesis: thesisDashboard,
            scientificResearch: researchDashboard
        }
    }

    async getStudentDashboard(studentId: string, facultyId: string) {
        const { latestThesisPeriod, latestResearchPeriod } =
            await this.getPeriodInfoProvider.getCurrentPeriodInfo(facultyId)

        const [thesisDashboard, researchDashboard] = await Promise.all([
            this.buildDashboardForPeriod(latestThesisPeriod, studentId, (provider, periodId, userid) =>
                provider.getStudentDashboard(periodId, userid)
            ),
            this.buildDashboardForPeriod(latestResearchPeriod, studentId, (provider, periodId, userid) =>
                provider.getStudentDashboard(periodId, userid)
            )
        ])

        return {
            thesis: thesisDashboard,
            scientificResearch: researchDashboard
        }
    }

    /**
     * 
             pipelineSub.push({
            $project: {
                _id: 1,
                year: 1,
                semester: 1,
                type: 1,
                facultyName: '$facultyInfo.name',
                status: 1,
                startTime: 1,
                endTime: 1,
                currentPhase: 1,
                currentPhaseDetail: 1
                phases: 1,
            }
        })
     */

    private async buildDashboardForPeriod(
        period: any,
        userId: string,
        providerCallback: (provider: any, periodId: string, userId: string) => Promise<any>
    ) {
        if (!period) {
            return {
                exists: false,
                message: 'Không tìm thấy kỳ',
                data: null
            }
        }

        // // chưa tạo pha mới -> pha mới nhất timeout
        if (period.status === 'timeout') {
            return {
                title: 'Hiện tại chưa có đợt đề tài nào',
                description: null,
                facultyName: period.facultyName,
                phases: null,
                currentPhaseDetail: null,
                currentPhase: null
            }
        }

        // Nếu đang pending và đã active nhưng chưa thiết lập pha
        if (
            period.status === 'pending' ||
            (period.status === 'active' && period.currentPhase === PeriodPhaseName.EMPTY)
        ) {
            return {
                _id: period._id,
                title: `Kì hiện tại: ${period.year} • HK ${period.semester} • ${this.typeLabels[period.type as keyof typeof this.typeLabels]}`,
                description: 'Kỳ hiện tại đang trong trạng thái chuẩn bị quy trình.',
                facultyName: period.facultyName,
                status: period.status,
                phases: null,
                currentPhaseDetail: null,
                currentPhase: null,
                type: null
            }
        }

        // Lấy provider và gọi getDashboardData qua callback
        try {
            const provider = this.getProviderByPhase(period.currentPhase)
            const data = await providerCallback(provider, period._id.toString(), userId)

            return {
                _id: period._id,
                title: `Kì hiện tại: ${period.year} • HK ${period.semester} • ${this.typeLabels[period.type as keyof typeof this.typeLabels]}`,
                description: this.phaseDescriptions[period.currentPhase],
                startTime: period.startTime,
                endTime: period.endTime,
                facultyName: period.facultyName,
                phases: period.phases,
                currentPhaseDetail: period.currentPhaseDetail,
                currentPhase: period.currentPhase,
                type: period.type,
                status: period.status,
                topicData: data
            }
        } catch (error) {
            throw new NotFoundException(
                `Không thể lấy dữ liệu dashboard cho phase ${period.currentPhase}: ${error.message}`
            )
        }
    }

    private getProviderByPhase(phase: string) {
        switch (phase) {
            case PeriodPhaseName.SUBMIT_TOPIC:
                return this.submitPhaseProvider
            case PeriodPhaseName.OPEN_REGISTRATION:
                return this.registrationPhaseProvider
            case PeriodPhaseName.EXECUTION:
                return this.executionPhaseProvider
            case PeriodPhaseName.COMPLETION:
                return this.completionPhaseProvider
            default:
                throw new NotFoundException(`Phase ${phase} không được hỗ trợ`)
        }
    }
}
