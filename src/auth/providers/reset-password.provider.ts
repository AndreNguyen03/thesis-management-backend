import { Injectable } from '@nestjs/common'
import { TokenNotFoundException, UserNotFoundException } from 'src/common/exceptions'
import { CacheService } from 'src/redis/providers/cache.service'
import { UsersService } from 'src/users/providers/users.service'
import { HashingProvider } from './hashing.provider'

@Injectable()
export class ResetPasswordProvider {
    constructor(
        private readonly usersService: UsersService,
        private readonly cacheService: CacheService,
        private readonly hashingProvider: HashingProvider
    ) {}

    // auth.service.ts
    async resetPassword(token: string, newPassword: string) {
        const userId = await this.cacheService.get<string>(`reset_token:${token}`)
        if (!userId) throw new TokenNotFoundException()

        const user = await this.usersService.findOneById(userId)
        if (!user) throw new UserNotFoundException()

        user.password_hash = await this.hashingProvider.hashPassword(newPassword)
        await user.save()

        // xóa token để ngăn reuse
        await this.cacheService.del(`reset_token:${token}`)

        return { message: 'Password has been reset successfully' }
    }
}
