import { HttpStatus } from '@nestjs/common'
import { BaseHttpException } from './base-http.exception'

export class YouAlreadyRegisteredForThisThesisException extends BaseHttpException {
    constructor() {
        super(
            'You have already registered for this thesis',
            'YOU_ALREADY_REGISTERED_FOR_THIS_THESIS',
            HttpStatus.BAD_REQUEST
        )
    }
}

export class RegistrationNotFoundException extends BaseHttpException {
    constructor(thesisId?: string) {
        super(`Bạn chưa đăng ký đề tài (${thesisId}) này`, 'REGISTRATION_NOT_FOUND', HttpStatus.NOT_FOUND)
    }
}
