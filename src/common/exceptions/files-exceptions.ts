import { HttpStatus } from '@nestjs/common'
import { BaseHttpException } from './base-http.exception'

export class FileNotFoundException extends BaseHttpException {
    constructor() {
        super('Không tìm thấy file hoặc đã bị xóa', 'FILE_NOT_FOUND', HttpStatus.NOT_FOUND)
    }
}
