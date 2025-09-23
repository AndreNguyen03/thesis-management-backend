import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { UserToken } from '../../schemas/token.schema'
import { BaseRepositoryAbstract } from 'src/shared/base/repository/base.abstract.repository'
import { UserTokenRepositoryInterface } from '../user-tokens.repository.interface'

@Injectable()
export class UserTokenRepository extends BaseRepositoryAbstract<UserToken> implements UserTokenRepositoryInterface {
    constructor(
        @InjectModel(UserToken.name)
        private readonly userTokensRepository: Model<UserToken>
    ) {
        super(userTokensRepository)
    }

    private mapUserId(userId: string | Types.ObjectId): Types.ObjectId {
        return typeof userId === 'string' ? new Types.ObjectId(userId) : userId
    }

    async findValidToken(userId: string, deviceId: string, refreshToken: string) {
        return this.userTokensRepository
            .findOne({
                userId: this.mapUserId(userId),
                deviceId,
                refreshToken,
                isValid: true
            })
            .exec()
    }

    async invalidateToken(userId: string, deviceId: string, refreshToken?: string) {
        const query: any = { userId: this.mapUserId(userId), deviceId }
        if (refreshToken) query.refreshToken = refreshToken
        return this.userTokensRepository.updateOne(query, { isValid: false }).exec()
    }

    async invalidateAllUserTokens(userId: string) {
        return this.userTokensRepository.updateMany({ userId: this.mapUserId(userId) }, { isValid: false }).exec()
    }

    async findAllValidTokens(userId: string) {
        return this.userTokensRepository
            .find({
                userId: this.mapUserId(userId),
                isValid: true
            })
            .exec()
    }
}
