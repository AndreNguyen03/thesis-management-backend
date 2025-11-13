import { HttpStatus } from '@nestjs/common'
import { BaseHttpException } from './base-http.exception'

export class PeriodNotFoundException extends BaseHttpException {
    constructor() {
        super('Không tìm thấy kỳ/đợt này hoặc đã bị xóa ', 'PERIOD_NOT_FOUND', HttpStatus.NOT_FOUND)
    }
}

export class PeriodPhaseNotFoundException extends BaseHttpException {
    constructor() {
        super('Không tìm thấy giai đoạn trong kỳ/đợt này', 'PERIOD_PHASE_NOT_FOUND', HttpStatus.NOT_FOUND)
    }
}
