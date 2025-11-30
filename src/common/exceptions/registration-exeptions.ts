import { HttpStatus } from '@nestjs/common'
import { BaseHttpException } from './base-http.exception'

export class LecturerAlreadyRegisteredForThisThesisException extends BaseHttpException {
    constructor() {
        super(
            'Giảng viên đã đăng ký đề tài này rồi',
            'LECTURER_ALREADY_REGISTERED_FOR_THIS_THESIS',
            HttpStatus.BAD_REQUEST
        )
    }
}

export class RegistrationNotFoundException extends BaseHttpException {
    constructor(thesisId?: string) {
        super(`Bạn chưa đăng ký đề tài (${thesisId}) này`, 'REGISTRATION_NOT_FOUND', HttpStatus.NOT_FOUND)
    }
}

export class FullLecturerSlotException extends BaseHttpException {
    constructor() {
        super('Đề tài đã đủ số lượng giảng viên đăng ký', 'FULL_LECTURER_SLOT', HttpStatus.BAD_REQUEST)
    }
}
export class TopicIsFullRegisteredException extends BaseHttpException {
    constructor() {
        super('Đề tài đã đạt số lượng sinh viên đăng ký tối đa', 'TOPIC_FULL_REGISTERED', HttpStatus.BAD_REQUEST)
    }
}

export class StudentRegistrationNotFoundException extends BaseHttpException {
    constructor() {
        super('Đăng ký của sinh viên không tồn tại ', 'STUDENT_REGISTRATION_NOT_FOUND', HttpStatus.NOT_FOUND)
    }
}
