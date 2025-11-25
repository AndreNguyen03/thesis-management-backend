import { Inject, Injectable } from '@nestjs/common'
import { IPeriodRepository } from '../repository/periods.repository.interface'
import { ValidateTopicStatusProvider } from '../../topics/providers/validate-status.provider'
@Injectable()
export class ValidatePeriodProvider {
    constructor(
        @Inject('IPeriodRepository') private readonly iPeriodRepository: IPeriodRepository,
        private readonly validateStatusProvider: ValidateTopicStatusProvider
    ) {}
    //kiểm tra xem hành động tiếp theo có được phép thực hiện hay không
    async validateActionAllowed(periodId: string, newStatus: string): Promise<boolean> {
        // Kiểm tra xem kì đã hết hạn hay chưa
        // Kiểm tra pha hiện tại có hết hạn hay chưas
        // Kiểm tra xem hành động có được phép thực hiện trong pha hiện tại không
        // hành động có đúng thứ tự không
        return false
    }
}
