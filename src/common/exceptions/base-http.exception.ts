import { HttpException, HttpStatus } from '@nestjs/common'

export class BaseHttpException extends HttpException {
    constructor(message: string, errorCode: string, statusCode: HttpStatus = HttpStatus.BAD_REQUEST) {
        super({ statusCode, errorCode, message }, statusCode)
    }
}

export class CreateErrorException extends BaseHttpException {
    constructor(message: string) {
        super(`Lỗi khi tạo ${message}`, 'CREATE_ERROR', HttpStatus.BAD_REQUEST)
    }
}

export class UpdateErrorException extends BaseHttpException {
    constructor(message: string) {
        super(`Lỗi khi cập nhật ${message}`, 'UPDATE_ERROR', HttpStatus.BAD_REQUEST)
    }
}

export class DeleteErrorException extends BaseHttpException {
    constructor(message: string) {
        super(`Lỗi khi xóa ${message}`, 'DELETE_ERROR', HttpStatus.BAD_REQUEST)
    }
}

