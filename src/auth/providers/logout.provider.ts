import { Inject, Injectable } from "@nestjs/common";
import { ActiveUserData } from "../interface/active-user-data.interface";
import { JwtService } from "@nestjs/jwt";
import { CacheService } from "src/redis/providers/cache.service";
import { TokensService } from "src/tokens/providers/tokens.service";
import jwtConfig from "../config/jwt.config";
import { ConfigType } from "@nestjs/config";
import { Types } from "mongoose";
import { TokenInvalidException, TokenNotFoundException } from "src/common/exceptions";

@Injectable()
export class LogoutProvider {
  constructor(
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
    private readonly tokensService: TokensService,
  ) {}

  async logout(accessToken?: string, refreshToken?: string) {

    if (!accessToken || !refreshToken) {
      throw new TokenNotFoundException()
    }

    // 1. Decode access token để lấy userId & exp
    const payload = this.jwtService.decode(accessToken) as ActiveUserData & { exp: number; deviceId: string };
    if (!payload) {
      throw new TokenInvalidException()
    }

    const { sub: userId, deviceId, exp } = payload;

    // map userId to objectId
    const userObjectId = new Types.ObjectId(userId);

    // 2. Invalidate refresh token trong DB
    await this.tokensService.invalidateToken(userObjectId, deviceId, refreshToken);

    // 3. Blacklist access token trong Redis với TTL = exp - now
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.cacheService.set(`blacklist:access:${accessToken}`, true, ttl);
    }

    return { message: "Logout successful" };
  }
}
