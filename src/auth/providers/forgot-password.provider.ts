import { Injectable } from '@nestjs/common'
import { UserNotFoundException } from 'src/common/exceptions'
import { MailService } from 'src/mail/providers/mail.service'
import { CacheService } from 'src/redis/providers/cache.service'
import { UsersService } from 'src/users/providers/users.service'

@Injectable()
export class ForgotPasswordProvider {
    constructor(
        private readonly usersService: UsersService,
        private readonly mailService: MailService,
        private readonly cacheService: CacheService
    ) {}

    async forgotPassword(email: string) {
        const user = await this.usersService.findOneByEmail(email)
        if (!user) throw new UserNotFoundException()

        const token = crypto.randomUUID()
        await this.cacheService.set(
            `reset_token:${token}`,
            user._id.toString(),
            60 * 2 // TTL 2 phút
        )

        await this.mailService.sendResetPasswordMail(user, token)

        return { message: 'Reset password email has been sent' }
    }
}
