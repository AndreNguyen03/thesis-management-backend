import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common'
import { SendData } from './dtos/send-data.dtos'
import { MailService } from './providers/mail.service'

@Controller('mail')
export class MailController {
    constructor(private readonly mailService: MailService) {}

    @Post('manual/send-email-in-period/:periodId')
    @HttpCode(202)
    async sendEmailInPeriod(@Param('periodId') periodId: string, @Body() body: SendData) {
        await this.mailService.sendCustomEmail(periodId, body)
        return { message: 'Yêu cầu gửi email đã được chấp nhận và đang được xử lý.' }
    }
}
