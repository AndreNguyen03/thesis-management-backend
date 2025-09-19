import { HttpException, HttpStatus } from '@nestjs/common'

export class BaseHttpException extends HttpException {
    constructor(message: string, errorCode: string, statusCode: HttpStatus = HttpStatus.BAD_REQUEST) {
        super({ statusCode, errorCode, message }, statusCode)
    }
}
