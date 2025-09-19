import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common'
import { AuthService } from './providers/auth.service'
import { ApiTags } from '@nestjs/swagger'
import { SignInDto } from './dtos/sign-in.dto'
import { Auth } from './decorator/auth.decorator'
import { AuthType } from './enum/auth-type.enum'
import { RefreshTokenDto } from './dtos/refresh-token.dto'
import { Request } from 'express'
import { ActiveUserData } from './interface/active-user-data.interface'

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('sign-in')
    @HttpCode(HttpStatus.OK)
    @Auth(AuthType.None)
    public async signIn(@Body() signInDto: SignInDto, @Req() req: Request) {
        const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string
        return this.authService.signIn(signInDto, ipAddress)
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @Auth(AuthType.None)
    public async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
        return this.authService.refreshTokens(refreshTokenDto)
    }

    @Get('access-token')
    @Auth(AuthType.Bearer)
    public async testAccessToken(@Req() req: Request) {
        return { user: req['user'], message: 'Access token is valid' }
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @Auth(AuthType.None)
    async forgotPassword(@Body('email') email: string) {
        return this.authService.forgotPassword(email)
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @Auth(AuthType.None)
    async resetPassword(@Body() body: { token: string; newPassword: string }) {
        return await this.authService.resetPassword(body.token, body.newPassword)
    }

    @Post('logout')
    @Auth(AuthType.Bearer)
    @HttpCode(HttpStatus.OK)
    async logout(@Req() req: Request, @Body('refreshToken') refreshToken: string) {
        const accessToken = req.headers.authorization?.split(' ')[1];
        console.log({accessToken,refreshToken});
        return await this.authService.logout(accessToken,refreshToken);
    }
}
