import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { UserToken } from '../../schemas/token.schema'
import { UserTokenRepositoryInterface } from '../user-tokens.repository.interface'
import { CreateUserTokenDto } from 'src/tokens/dtos/create-user-token.dto'

@Injectable()
export class UserTokenRepository implements UserTokenRepositoryInterface {
    constructor(
        @InjectModel(UserToken.name)
        private readonly userTokensRepository: Model<UserToken>
    ) {}

    private mapUserId(userId: string | Types.ObjectId): Types.ObjectId {
        return typeof userId === 'string' ? new Types.ObjectId(userId) : userId
    }

    async createToken(createUserTokenDto: CreateUserTokenDto): Promise<UserToken> {
        try {
            const token = await this.userTokensRepository.create({
                ...createUserTokenDto,
                isValid: true
            })
            return token.toObject()
        } catch (err) {
            throw new InternalServerErrorException('Failed to create token')
        }
    }

    async findValidToken(userId: string, deviceId: string, refreshToken: string) {
        return this.userTokensRepository
            .findOne({
                userId: this.mapUserId(userId),
                deviceId,
                refreshToken,
                isValid: true
            })
            .lean()
    }

    async invalidateToken(userId: string, deviceId: string, refreshToken?: string): Promise<UserToken | null> {
        try {
            const query: any = { userId, deviceId }
            if (refreshToken) query.refreshToken = refreshToken

            return await this.userTokensRepository.findOneAndUpdate(query, { isValid: false }, { new: true }).lean()
        } catch (err) {
            throw new InternalServerErrorException('Failed to invalidate token')
        }
    }

    async invalidateAllUserTokens(userId: string) {
        return this.userTokensRepository.updateMany({ userId: this.mapUserId(userId) }, { isValid: false }).lean()
    }

    async findAllValidTokens(userId: string) {
        return this.userTokensRepository
            .find({
                userId: this.mapUserId(userId),
                isValid: true
            })
            .lean()
    }
}
