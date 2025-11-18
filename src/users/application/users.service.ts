import { Inject, Injectable } from '@nestjs/common'
import { UserRepositoryInterface } from '../repository/user.repository.interface'
import { BaseServiceAbstract } from '../../shared/base/service/base.service.abstract'
import { User } from '../schemas/users.schema'
import { ConfigService } from '@nestjs/config'
import { UploadAvatarProvider } from '../../modules/upload-files/providers/upload-avatar.provider'

@Injectable()
export class UserService extends BaseServiceAbstract<User> {
    private readonly minioDownloadUrlBase: string
    constructor(
        @Inject('UserRepositoryInterface')
        private readonly userRepository: UserRepositoryInterface,
        private readonly uploadAvatarProvider: UploadAvatarProvider,
        @Inject(ConfigService) private readonly configService: ConfigService
    ) {
        super(userRepository)
        this.minioDownloadUrlBase = this.configService.get<string>('MINIO_DOWNLOAD_URL_BASE')!
    }

    

    async findByEmail(email: string): Promise<User | null> {
        return await this.userRepository.findByEmail(email)
    }

    async findById(id: string): Promise<User | null> {
        const user = await this.findOneById(id)
        return user
    }

    async updatePassword(id: string, newPasswordHash: string): Promise<boolean> {
        const result = await this.userRepository.updatePassword(id, newPasswordHash)
        return result
    }
    async uploadAvatar(userId: string, file: Express.Multer.File): Promise<string> {
        const avatarName = await this.uploadAvatarProvider.uploadAvatar(userId,file)
        const avatarUrl = `${this.minioDownloadUrlBase}/${avatarName}`
        await this.update(userId, { avatarName, avatarUrl })
        return avatarUrl
    }



}
