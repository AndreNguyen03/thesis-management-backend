import { InjectModel } from '@nestjs/mongoose'
import { BaseRepositoryAbstract } from '../../../../shared/base/repository/base.repository.abstract'
import { Period, PeriodPhase } from '../../schemas/period.schemas'
import { IPeriodRepository } from '../periods.repository.interface'
import mongoose, { Model } from 'mongoose'
import { RequestGetPeriodsDto } from '../../dtos/request-get-all.dto'
import { PaginationProvider } from '../../../../common/pagination-an/providers/pagination.provider'
import { BadRequestException, RequestTimeoutException } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { Paginated } from '../../../../common/pagination-an/interfaces/paginated.interface'
import { PeriodStatus } from '../../enums/periods.enum'
import { PeriodPhaseName } from '../../enums/period-phases.enum'
import { GetCurrentPhaseResponseDto } from '../../dtos/period-phases.dtos'

export class PeriodRepository extends BaseRepositoryAbstract<Period> implements IPeriodRepository {
    constructor(
        @InjectModel(Period.name) private readonly periodModel: Model<Period>,
        private readonly paginationProvider: PaginationProvider
    ) {
        super(periodModel)
    }

    async createPhaseInPeriod(newPhase: PeriodPhase, periodId: string): Promise<boolean> {
        try {
            const res = await this.periodModel.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(periodId), deleted_at: null },
                {
                    $push: { phases: newPhase },
                    $set: { currentPhase: newPhase.phase }
                }
            )
            if (!res) {
                throw new BadRequestException('Không tìm thấy kỳ để thêm giai đoạn')
            }
            return true
        } catch (error) {
            console.log('Error in createPhaseInPeriod:', error)
            throw new RequestTimeoutException()
        }
    }
    async getCurrentPhase(periodId: string): Promise<GetCurrentPhaseResponseDto> {
        const res = await this.periodModel
            .findOne(
                { _id: new mongoose.Types.ObjectId(periodId), isDeleted: false, 'phases.phase': '$currentPhase' },
                { projection: { currentPhase: 1, 'phases.$.endtime': 1 } }
            )
            .exec()
        if (!res) {
            throw new BadRequestException('Không tìm thấy kỳ')
        }
        return plainToInstance(GetCurrentPhaseResponseDto, res)
    }
    async getAllPeriods(facultyId: string, query: RequestGetPeriodsDto): Promise<Paginated<Period>> {
        let pipelineSub: any[] = []
        //Tìm kiếm những period trong khoa
        pipelineSub.unshift({ $match: { facultyId: new mongoose.Types.ObjectId(facultyId), deleted_at: null } })
        return this.paginationProvider.paginateQuery<Period>(query, this.periodModel, pipelineSub)
    }
    async deletePeriod(periodId: string): Promise<boolean> {
        const result = await this.periodModel.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(periodId), deleted_at: null } },
            { $project: { phasesCount: { $size: '$phases' } } }
        ])

        if (result.length === 0) {
            throw new BadRequestException('Kỳ không tồn tại hoặc đã bị xóa')
        }
        if (result[0].phasesCount > 0) {
            throw new BadRequestException('Kỳ này đang có giai đoạn có hiệu lực, không thể xóa')
        }

        const res = await this.periodModel.updateOne(
            { _id: new mongoose.Types.ObjectId(periodId), deleted_at: null },
            { deleted_at: new Date() }
        )
        return res.modifiedCount > 0
    }
    async getSubmissionStatus(
        lecturerId: string,
        facultyId: string
    ): Promise<{
        currentPeriod: string | null
        currentPhase: string | null
        isEligible: boolean
        reason: string | null
        minTopics: number
    }> {
        console.log('facultyId in repo:', facultyId)
        const period = await this.periodModel.findOne({
            status: PeriodStatus.OnGoing,
            facultyId: new mongoose.Types.ObjectId(facultyId),
            deleted_at: null
        })

        if (!period)
            return {
                currentPeriod: null,
                currentPhase: null,
                isEligible: false,
                reason: 'Không tìm thấy kì hiện tại',
                minTopics: 0
            }
        if (period.currentPhase !== PeriodPhaseName.SUBMIT_TOPIC) {
            return {
                currentPeriod: period.name,
                currentPhase: period.currentPhase,
                isEligible: false,
                reason: 'Kì hiện tại không ở giai đoạn nộp đề tài',
                minTopics: 0
            }
        }

        const currenPhaseDetail = period?.phases.filter((phase) => phase.phase === PeriodPhaseName.SUBMIT_TOPIC)

        //Kiểm tra xem giảng viên có trong danh sách được nộp đề tài hay không
        const isEligible = currenPhaseDetail[0]?.requiredLecturerIds.includes(lecturerId)
        if (isEligible) {
            if (currenPhaseDetail[0]?.endTime < new Date()) {
                // Kiểm tra xem thời gian nộp đề tài đã kế thúc hay chưa
                return {
                    currentPeriod: period.name,
                    currentPhase: period.currentPhase,
                    isEligible: false,
                    reason: 'Thời gian nộp đề tài đã kết thúc',
                    minTopics: 0
                }
            }
            if (currenPhaseDetail[0]?.startTime > new Date()) {
                // Kiểm tra xem thời gian nộp đề tài đã bắt đầu hay chưa
                return {
                    currentPeriod: period.name,
                    currentPhase: period.currentPhase,
                    isEligible: false,
                    reason: 'Chưa đến thời gian nộp đề tài',
                    minTopics: 0
                }
            }
        } else {
            return {
                currentPeriod: period.name,
                currentPhase: period.currentPhase,
                isEligible: false,
                reason: 'Bạn không được yêu cầu nộp đề tài trong kỳ này',
                minTopics: 0
            }
        }

        return {
            currentPeriod: period.name,
            currentPhase: period.currentPhase,
            isEligible: true,
            reason: null,
            minTopics: currenPhaseDetail[0]?.minTopicsPerLecturer || 0
        }
    }

    async getCurrentPeriodInfo(facultyId: string) {
        const currentPeriod = await this.periodModel
            .findOne({
                facultyId: new mongoose.Types.ObjectId(facultyId),
                status: PeriodStatus.OnGoing,
                deleted_at: null
            })
            .populate('facultyId')
        if (!currentPeriod) {
            return null
        }
        const { currentPhase, facultyId: facultyIdRes, ...currentPeriodObject } = currentPeriod.toObject()
        const currentPeriodPhase = currentPeriod.phases.find((phase) => phase.phase === currentPeriod.currentPhase)
        return {
            ...currentPeriodObject,
            faculty: facultyIdRes,
            currentPhaseDetail: currentPeriodPhase
                ? {
                      ...currentPeriodPhase,
                      status: (() => {
                          const now = new Date()
                          if (now < currentPeriodPhase.startTime) {
                              return 'PENDING'
                          } else if (now >= currentPeriodPhase.startTime && now <= currentPeriodPhase.endTime) {
                              return 'ACTIVE'
                          } else {
                              return 'COMPLETED'
                          }
                      })()
                  }
                : null
        }
    }

    private async AbstractGetPeriodInfo(periodId: string) {
        let pipelineMain: any[] = []
        //lookup với bảng faculty
        pipelineMain.push(
            ...[
                {
                    $lookup: {
                        from: 'faculties',
                        localField: 'facultyId',
                        foreignField: '_id',
                        as: 'faculty'
                    }
                },
                {
                    $unwind: {
                        path: '$faculty'
                    }
                }
            ]
        )
        // kết bảng bảng với phases thể lấy thông tin giai đoạn
        pipelineMain.push({ $match: { _id: new mongoose.Types.ObjectId(periodId), deleted_at: null } })
        return pipelineMain
    }
    async getDetailPeriod(periodId: string) {
        let pipelineMain: any[] = []
        pipelineMain.push(...(await this.AbstractGetPeriodInfo(periodId)))

        const result = await this.periodModel.aggregate(pipelineMain)
        if (!result || result.length === 0) return null

        const period = result[0]
        const now = new Date()

        period.phases = (period.phases || []).map((phase: any) => {
            let status = 'not_started'
            if (now < new Date(phase.startTime)) {
                status = 'not_started'
            } else if (now >= new Date(phase.startTime) && now <= new Date(phase.endTime)) {
                status = 'ongoing'
            } else if (now > new Date(phase.endTime)) {
                status = 'completed'
            }
            return { ...phase, status }
        })

        return period
    }
}
