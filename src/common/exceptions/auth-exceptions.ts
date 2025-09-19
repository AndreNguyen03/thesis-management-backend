import { BaseHttpException } from './base-http.exception'
import { HttpStatus } from '@nestjs/common'

export class AccessTokenExpiredException extends BaseHttpException {
    constructor() {
        super('Access token expired', 'ACCESS_TOKEN_EXPIRED', HttpStatus.UNAUTHORIZED)
    }
}

export class RefreshTokenExpiredException extends BaseHttpException {
    constructor() {
        super('Refresh token expired, login again', 'REFRESH_TOKEN_EXPIRED', HttpStatus.UNAUTHORIZED)
    }
}

export class TokenInvalidException extends BaseHttpException {
    constructor() {
        super('Token invalidated, login again', 'TOKEN_INVALID', HttpStatus.UNAUTHORIZED)
    }
}

export class TokenNotFoundException extends BaseHttpException {
    constructor() {
        super('Token not found', 'TOKEN_NOT_FOUND', HttpStatus.UNAUTHORIZED)
    }
}

export class TokenDeviceMismatchException extends BaseHttpException {
    constructor() {
        super('Token device mismatch', 'TOKEN_DEVICE_MISMATCH', HttpStatus.UNAUTHORIZED)
    }
}
