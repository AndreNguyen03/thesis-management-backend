import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { SignInDto } from './dtos/sign-in.dto'
import { Auth } from './decorator/auth.decorator'
import { AuthType } from './enum/auth-type.enum'
import { Request, Response } from 'express'
import { TokenNotFoundException } from 'src/common/exceptions'
import { AuthService } from './application/auth.service'

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('sign-in')
    @HttpCode(HttpStatus.OK)
    @Auth(AuthType.None)
    public async signIn(@Body() signInDto: SignInDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string
        const { accessToken, refreshToken } = await this.authService.signIn(signInDto, ipAddress)

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        return { accessToken }
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @Auth(AuthType.None)
    public async refreshTokens(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshTokenFromCookie = req.cookies?.refreshToken

        if (!refreshTokenFromCookie) throw new TokenNotFoundException()

        const tokens = await this.authService.refreshTokens(refreshTokenFromCookie)

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return { accessToken: tokens.accessToken }
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
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const accessToken = req.headers.authorization?.split(' ')[1]
        const refreshToken = req.cookies['refreshToken']
        if (!refreshToken) {
            throw new BadRequestException('Refresh token not found')
        }

        await this.authService.logout(accessToken, refreshToken)

        // Xoá cookie refresh token
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        })

        return { message: 'Logout successfully' }
    }
}
