import { HttpStatus } from '@nestjs/common'
import { BaseHttpException } from './base-http.exception'

export class StudentAlreadyRegisteredException extends BaseHttpException {
    constructor(submessage?: string) {
        super(
            `Student already registered ${'and' + submessage || ''}`,
            'STUDENT_ALREADY_REGISTERED',
            HttpStatus.BAD_REQUEST
        )
    }
}
export class TopicIsFullRegisteredException extends BaseHttpException {
    constructor() {
        super('Topic has reached the maximum number of students', 'Topic_FULL_REGISTERED', HttpStatus.BAD_REQUEST)
    }
}

export class TopicNotFoundException extends BaseHttpException {
    constructor() {
        super('Không tìm thấy đề tài này hoặc đã bị xóa.', 'Topic_NOT_FOUND', HttpStatus.NOT_FOUND)
    }
}
export class RejectedException extends BaseHttpException {
    constructor() {
        super('Đăng ký đề tài đã bị từ chối', 'Topic_REGISTRATION_REJECTED', HttpStatus.BAD_REQUEST)
    }
}

export class TopicNotArchivedException extends BaseHttpException {
    constructor() {
        super('Đăng ký đề tài đã bị từ chối', 'Topic_REGISTRATION_REJECTED', HttpStatus.BAD_REQUEST)
    }
}
