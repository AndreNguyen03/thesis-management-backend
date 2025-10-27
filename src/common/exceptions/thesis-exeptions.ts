import { HttpStatus } from '@nestjs/common'
import { BaseHttpException } from './base-http.exception'

export class StudentAlreadyRegisteredException extends BaseHttpException {
    constructor() {
        super(`Sinh viên đã đăng ký đề tài này rồi`, 'STUDENT_ALREADY_REGISTERED', HttpStatus.BAD_REQUEST)
    }
}
export class StudentJustRegisterOnlyOneTopicEachType extends BaseHttpException {
    constructor(message: string) {
        super(`Sinh viên chỉ được đăng ký một đề tài thuộc: ${message}`, 'STUDENT_JUST_REGISTER_ONE_TOPIC_EACH_TYPE', HttpStatus.BAD_REQUEST)
    }
}


export class TopicNotFoundException extends BaseHttpException {
    constructor() {
        super('Không tìm thấy đề tài này hoặc đã bị xóa.', 'TOPIC_NOT_FOUND', HttpStatus.NOT_FOUND)
    }
}
export class RejectedException extends BaseHttpException {
    constructor() {
        super('Đăng ký đề tài đã bị từ chối', 'TOPIC_REGISTRATION_REJECTED', HttpStatus.BAD_REQUEST)
    }
}

export class TopicNotArchivedException extends BaseHttpException {
    constructor() {
        super('Đăng ký đề tài đã bị từ chối', 'TOPIC_REGISTRATION_REJECTED', HttpStatus.BAD_REQUEST)
    }
}
