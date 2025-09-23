import { BaseRepositoryInterface } from 'src/shared/base/repository/base.interface.repository'
import type { UserToken } from '../schemas/token.schema'

export interface UserTokenRepositoryInterface extends BaseRepositoryInterface<UserToken> {
    findValidToken(userId: string, deviceId: string, refreshToken: string): Promise<UserToken | null>
    invalidateToken(userId: string, deviceId: string, refreshToken?: string): Promise<any>
    invalidateAllUserTokens(userId: string): Promise<any>
    findAllValidTokens(userId: string): Promise<UserToken[]>
}
