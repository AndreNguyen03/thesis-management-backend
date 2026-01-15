import { Controller, Post, Body, Req } from '@nestjs/common'
import { MatchingService } from './application/matching.service'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'
import { MatchLecturerRequestDto } from './dtos/match-lecturer-request.dto'
import { MatchLecturerResponseDto } from './dtos/match-lecturer-response.dto'
import { Roles } from '../../auth/decorator/roles.decorator'
import { UserRole } from '../../auth/enum/user-role.enum'

@Controller('matching')
@Auth(AuthType.Bearer)
@Roles(UserRole.STUDENT)
export class MatchingController {
    constructor(private readonly matchingService: MatchingService) {}

    @Post('lecturers')
    async matchLecturers(
        @Req() req: { user: ActiveUserData },
        @Body() dto: MatchLecturerRequestDto
    ): Promise<MatchLecturerResponseDto> {
        return this.matchingService.matchLecturers(req.user.sub, dto)
    }
}
