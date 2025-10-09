// src/common/exceptions/user-exceptions.ts
import { BaseHttpException } from './base-http.exception'
import { HttpStatus } from '@nestjs/common'

export class UserNotFoundException extends BaseHttpException {
    constructor() {
        super('User not found', 'USER_NOT_FOUND', HttpStatus.NOT_FOUND)
    }
}

export class UserInactiveException extends BaseHttpException {
    constructor() {
        super('User is inactive', 'USER_INACTIVE', HttpStatus.FORBIDDEN)
    }
}

// Một số lỗi user thường gặp khác
export class UserAlreadyExistsException extends BaseHttpException {
    constructor() {
        super('User already exists', 'USER_ALREADY_EXISTS', HttpStatus.CONFLICT)
    }
}

export class UserEmailNotVerifiedException extends BaseHttpException {
    constructor() {
        super('User email is not verified', 'USER_EMAIL_NOT_VERIFIED', HttpStatus.FORBIDDEN)
    }
}

export class UserPasswordIncorrectException extends BaseHttpException {
    constructor() {
        super('Incorrect password', 'USER_PASSWORD_INCORRECT', HttpStatus.UNAUTHORIZED)
    }
}

export class UserCannotDeleteException extends BaseHttpException {
    constructor() {
        super('Cannot delete user', 'USER_CANNOT_DELETE', HttpStatus.FORBIDDEN)
    }
}

export class StudentNotFoundException extends BaseHttpException {
    constructor() {
        super('Student not found', 'STUDENT_NOT_FOUND', HttpStatus.NOT_FOUND)
    }
}

export class LecturerNotFoundException extends BaseHttpException {
    constructor() {
        super('Lecturer not found', 'LECTURER_NOT_FOUND', HttpStatus.NOT_FOUND)
    }
}

export class WrongRoleException extends BaseHttpException {
    constructor(message?: string) {
        super(`Need student role ${message ? "for " + message : ""}`, 'WRONG_ROLE', HttpStatus.BAD_REQUEST)
    }
}
