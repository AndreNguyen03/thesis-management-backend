import { HttpStatus } from '@nestjs/common'
import { BaseHttpException } from './base-http.exception'

export class StudentAlreadyRegisteredException extends BaseHttpException {
    constructor() {
        super('Student already registered', 'STUDENT_ALREADY_REGISTERED', HttpStatus.BAD_REQUEST)
    }
}
export class ThesisIsFullRegisteredException extends BaseHttpException {
    constructor() {
        super('Thesis has reached the maximum number of students', 'THESIS_FULL_REGISTERED', HttpStatus.BAD_REQUEST)
    }
}

export class ThesisNotFoundException extends BaseHttpException {
    constructor() {
        super('Thesis not found', 'THESIS_NOT_FOUND', HttpStatus.NOT_FOUND)
    }
}
